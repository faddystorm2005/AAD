'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthContext';
import BookingWeather from '@/components/BookingWeather';

import {
  Stage,
  STAGE_LABELS,
  getStagesForBooking,
  normalizeStage,
} from '@/lib/bookingStages';
import RescheduleModal from '@/components/RescheduleModal';

type Status =
  | 'pending'
  | 'approved'
  | 'declined'
  | 'cancelled'
  | 'confirmed'
  | 'in_progress'
  | 'completed';

export interface BookingRow {
  id: string;
  service: string;
  scheduled_at: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  deposit_amount: number;
  deposit_paid: boolean;
  total: number;
  booking_stage: Stage;
  status: Status;
  decline_reason: string | null;
  payment_url: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  addons: string[] | null;
  is_ceramic?: boolean;
  slot_date?: string | null;
  slot_time?: string | null;
  cancel_requested_at?: string | null;
  cancel_request_reason?: string | null;
}

const STATUS_BADGES: Record<Status, { label: string; className: string }> = {
  pending: { label: 'Pending approval', className: 'bg-yellow-900/40 text-yellow-300 border-yellow-800' },
  approved: { label: 'Approved · pay deposit', className: 'bg-blue-900/40 text-blue-300 border-blue-800' },
  declined: { label: 'Declined', className: 'bg-red-900/40 text-red-300 border-red-800' },
  cancelled: { label: 'Cancelled', className: 'bg-gray-800 text-gray-400 border-gray-700' },
  confirmed: { label: 'Confirmed', className: 'bg-green-900/40 text-green-300 border-green-800' },
  in_progress: { label: 'In progress', className: 'bg-green-900/40 text-green-300 border-green-800' },
  completed: { label: 'Completed', className: 'bg-gray-800 text-gray-300 border-gray-700' },
};

const CUSTOMER_CANCELLABLE: Status[] = ['pending', 'approved', 'confirmed'];

function StageProgress({ stage, addons }: { stage: Stage; addons: string[] | null }) {
  const order = getStagesForBooking(addons);
  const normalized = normalizeStage(stage);
  const currentIndex = order.indexOf(normalized);
  return (
    <div className="flex gap-1">
      {order.map((s, i) => (
        <div
          key={s}
          title={STAGE_LABELS[s]}
          className={`h-1.5 flex-1 rounded-full ${
            i <= currentIndex ? 'bg-red-600' : 'bg-gray-700'
          }`}
        />
      ))}
    </div>
  );
}

const CUSTOMER_DELETABLE: Status[] = ['pending', 'declined', 'cancelled', 'completed'];

export default function BookingsList() {
  const { user, session, loading: authLoading } = useAuth();
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [reschedulingBooking, setReschedulingBooking] = useState<BookingRow | null>(null);

  // Customers no longer cancel directly - they submit a request and the
  // admin approves or denies (and may issue an account credit).
  const handleRequestCancellation = async (bookingId: string) => {
    if (!session?.access_token) return;
    const reason = window.prompt(
      "Request cancellation? Tell us briefly why so we can decide quickly. We'll review and get back to you. If we approve and you've paid a deposit, you'll get account credit toward a future booking.",
      ''
    );
    // Null = user pressed Cancel on the prompt itself. Empty string is OK.
    if (reason === null) return;

    setCancellingId(bookingId);
    setDeleteError(null);
    const prev = bookings;
    // Optimistic: stamp cancel_requested_at locally so the badge appears
    // instantly. Rolls back if the API call fails.
    setBookings((list) =>
      list.map((b) =>
        b.id === bookingId
          ? {
              ...b,
              cancel_requested_at: new Date().toISOString(),
              cancel_request_reason: reason || null,
            }
          : b
      )
    );
    try {
      const res = await fetch('/api/bookings/cancel-request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ bookingId, reason }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || 'Request failed');
      }
    } catch (err: any) {
      setBookings(prev);
      setDeleteError(err.message || 'Request failed');
    } finally {
      setCancellingId(null);
    }
  };

  const handleDelete = async (bookingId: string) => {
    if (!session?.access_token) return;
    if (!window.confirm('Remove this booking from your history? This cannot be undone.')) {
      return;
    }
    setDeletingId(bookingId);
    setDeleteError(null);
    try {
      const res = await fetch('/api/bookings/delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ bookingId }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || 'Delete failed');
      }
      // Realtime will refresh the list; clear local state in case it doesn't fire.
      setBookings((prev) => prev.filter((b) => b.id !== bookingId));
    } catch (err: any) {
      setDeleteError(err.message || 'Delete failed');
    } finally {
      setDeletingId(null);
    }
  };

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setBookings([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    const load = async () => {
      const { data } = await supabase
        .from('bookings')
        .select(
          'id, service, scheduled_at, address, city, state, zip, deposit_amount, deposit_paid, total, booking_stage, status, decline_reason, payment_url, started_at, completed_at, created_at, addons, is_ceramic, slot_date, slot_time, cancel_requested_at, cancel_request_reason'
        )
        .eq('user_id', user.id)
        .order('scheduled_at', { ascending: true });

      if (!cancelled) {
        setBookings((data as BookingRow[]) ?? []);
        setLoading(false);
      }
    };

    load();

    const channel = supabase
      .channel(`bookings-user-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bookings',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          load();
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [user, authLoading]);

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="h-24 animate-pulse rounded-lg bg-gray-800" />
      </div>
    );
  }

  if (bookings.length === 0) {
    return <p className="text-sm text-gray-400">No active bookings</p>;
  }

  return (
    <div className="space-y-3">
      {deleteError && (
        <div className="rounded-lg border border-red-700 bg-red-900/40 p-3 text-sm text-red-200">
          {deleteError}
        </div>
      )}
      {bookings.map((b, i) => {
        const status: Status = b.status ?? 'pending';
        const badge = STATUS_BADGES[status];
        const showStageBar = status === 'confirmed' || status === 'in_progress' || status === 'completed';
        const canDelete = CUSTOMER_DELETABLE.includes(status);
        const isDeleting = deletingId === b.id;
        return (
          <div
            key={b.id}
            className="lift-hover animate-fade-up rounded-lg border border-gray-600 bg-gray-800 p-4"
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <p className="font-semibold text-white">{b.service}</p>
                <p className="mt-1 text-sm text-gray-400">
                  {new Date(b.scheduled_at).toLocaleString()}
                </p>
                <div className="mt-1">
                  <BookingWeather date={b.scheduled_at} compact />
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  {b.address}, {b.city}, {b.state} {b.zip}
                </p>
                {status === 'declined' && b.decline_reason && (
                  <p className="mt-2 text-xs text-red-300">Reason: {b.decline_reason}</p>
                )}
              </div>
              <div className="flex flex-col items-end gap-1 text-xs">
                <span className={`rounded-full border px-2 py-0.5 font-medium ${badge.className}`}>
                  {badge.label}
                </span>
                <span className="text-gray-400">Total ${Number(b.total).toFixed(2)}</span>
              </div>
            </div>

            {status === 'approved' && b.payment_url && (
              <a
                href={b.payment_url}
                target="_blank"
                rel="noopener noreferrer"
                className="press mt-3 inline-block rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
              >
                Pay ${Number(b.deposit_amount).toFixed(2)} deposit →
              </a>
            )}

            {showStageBar && (
              <div className="mt-3">
                <div className="mb-1 flex justify-between text-xs text-gray-400">
                  <span>{STAGE_LABELS[normalizeStage(b.booking_stage)]}</span>
                  {b.completed_at && b.booking_stage === 'done' && (
                    <span>Completed {new Date(b.completed_at).toLocaleString()}</span>
                  )}
                </div>
                <StageProgress stage={b.booking_stage} addons={b.addons} />
              </div>
            )}

            {b.cancel_requested_at && CUSTOMER_CANCELLABLE.includes(status) && (
              <div className="mt-3 rounded-lg border border-amber-500/40 bg-amber-900/30 p-3 text-xs text-amber-200">
                <p className="font-semibold">Cancellation request pending</p>
                <p className="mt-1 text-amber-200/80">
                  We&apos;re reviewing your request. You&apos;ll get a text/email
                  once it&apos;s decided. The booking is still scheduled until then.
                </p>
                {b.cancel_request_reason && (
                  <p className="mt-2 text-amber-200/60">
                    Your note: &ldquo;{b.cancel_request_reason}&rdquo;
                  </p>
                )}
              </div>
            )}

            <div className="mt-3 flex items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-3">
                {CUSTOMER_CANCELLABLE.includes(status) && !b.cancel_requested_at && (
                  <>
                    <button
                      type="button"
                      onClick={() => setReschedulingBooking(b)}
                      className="text-xs text-blue-400 hover:text-blue-300"
                    >
                      Reschedule
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRequestCancellation(b.id)}
                      disabled={cancellingId === b.id}
                      className="text-xs text-gray-400 hover:text-red-400 disabled:opacity-50"
                    >
                      {cancellingId === b.id
                        ? 'Submitting…'
                        : 'Request cancellation'}
                    </button>
                  </>
                )}
                {canDelete && (
                  <button
                    type="button"
                    onClick={() => handleDelete(b.id)}
                    disabled={isDeleting}
                    className="text-xs text-gray-500 hover:text-red-400 disabled:opacity-50"
                  >
                    {isDeleting ? 'Removing…' : 'Remove'}
                  </button>
                )}
              </div>
              <Link
                href={`/booking-confirmation/${b.id}`}
                className="text-xs text-gray-400 underline-offset-2 hover:text-white hover:underline"
              >
                View details →
              </Link>
            </div>
          </div>
        );
      })}

      {reschedulingBooking && (
        <RescheduleModal
          bookingId={reschedulingBooking.id}
          isCeramic={Boolean(reschedulingBooking.is_ceramic)}
          currentSlotDate={reschedulingBooking.slot_date ?? ''}
          currentSlotTime={reschedulingBooking.slot_time ?? ''}
          onClose={() => setReschedulingBooking(null)}
          onRescheduled={() => {
            // Realtime subscription will refresh the list, but trigger a
            // local clear of the modal so the user sees instant feedback.
            setReschedulingBooking(null);
          }}
        />
      )}
    </div>
  );
}
