'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import { ADD_ONS } from '@/lib/bookingPricing';
import {
  Stage,
  STAGE_LABELS,
  getStagesForBooking,
  normalizeStage,
} from '@/lib/bookingStages';
import DailyCapacityPanel from '@/components/admin/DailyCapacityPanel';
import GoogleCalendarSubscribe from '@/components/admin/GoogleCalendarSubscribe';
import ManageAdmins from '@/components/admin/ManageAdmins';
import ManagePromoCodes from '@/components/admin/ManagePromoCodes';

type Status =
  | 'pending'
  | 'approved'
  | 'declined'
  | 'confirmed'
  | 'in_progress'
  | 'completed';

const STATUS_BADGES: Record<Status, { label: string; className: string }> = {
  pending: { label: 'Pending', className: 'bg-yellow-900/40 text-yellow-300 border-yellow-800' },
  approved: { label: 'Approved · awaiting deposit', className: 'bg-blue-900/40 text-blue-300 border-blue-800' },
  declined: { label: 'Declined', className: 'bg-red-900/40 text-red-300 border-red-800' },
  confirmed: { label: 'Confirmed', className: 'bg-green-900/40 text-green-300 border-green-800' },
  in_progress: { label: 'In progress', className: 'bg-green-900/40 text-green-300 border-green-800' },
  completed: { label: 'Completed', className: 'bg-gray-800 text-gray-300 border-gray-700' },
};

const SIZE_LABELS: Record<string, string> = {
  small: 'Small Sedan / Coupe',
  suv: 'SUV',
  truck: 'Truck / 3-Row',
};

interface Vehicle {
  year: number;
  make: string;
  model: string;
  color: string | null;
  nickname: string | null;
  size: string;
}

interface Customer {
  full_name: string | null;
  phone: string | null;
  email: string | null;
}

interface AdminBooking {
  id: string;
  user_id: string;
  vehicle_id: string;
  service: string;
  size: string;
  addons: string[] | null;
  scheduled_at: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  deposit_amount: number;
  deposit_paid: boolean;
  subtotal: number;
  total: number;
  discount_amount: number;
  discount_applied: boolean;
  booking_stage: Stage;
  status: Status;
  decline_reason: string | null;
  payment_url: string | null;
  approved_at: string | null;
  declined_at: string | null;
  is_ceramic: boolean;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  customer: Customer | null;
  vehicle: Vehicle | null;
}

function formatAddons(ids: string[] | null | undefined): string[] {
  if (!ids || ids.length === 0) return [];
  return ids.map((id) => ADD_ONS.find((a) => a.id === id)?.name ?? id);
}

export default function AdminPage() {
  const { user, session, loading: authLoading, signOut } = useAuth();
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [bookings, setBookings] = useState<AdminBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'pending' | 'active' | 'all'>('pending');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Auto-clear success banner after 2.5s.
  useEffect(() => {
    if (!actionSuccess) return;
    const t = setTimeout(() => setActionSuccess(null), 2500);
    return () => clearTimeout(t);
  }, [actionSuccess]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [declineReasonDraft, setDeclineReasonDraft] = useState<Record<string, string>>({});

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace('/auth');
      return;
    }

    (async () => {
      const { data } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', user.id)
        .maybeSingle();
      setIsAdmin(Boolean(data?.is_admin));
    })();
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!isAdmin) return;

    let cancelled = false;
    const load = async () => {
      const { data, error } = await supabase
        .from('bookings')
        .select(
          `*,
           customer:profiles!user_id(full_name, phone, email),
           vehicle:vehicles!vehicle_id(year, make, model, color, nickname, size)`
        )
        .order('scheduled_at', { ascending: true });
      if (cancelled) return;
      if (error) {
        setLoadError(error.message);
        setBookings([]);
      } else {
        setLoadError(null);
        setBookings((data as AdminBooking[]) ?? []);
      }
      setLoading(false);
    };

    load();

    const channel = supabase
      .channel('admin-bookings')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'bookings' },
        () => load()
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [isAdmin]);

  const handleStageChange = async (bookingId: string, stage: Stage) => {
    if (!session?.access_token) return;
    setUpdatingId(bookingId);
    setActionError(null);

    // Optimistic update — mirror the server-side logic in
    // /api/admin/update-stage so the UI reflects the change instantly.
    const prev = bookings;
    const now = new Date().toISOString();
    setBookings((list) =>
      list.map((b) => {
        if (b.id !== bookingId) return b;
        const next: AdminBooking = { ...b, booking_stage: stage };
        if (stage !== 'requested' && !b.started_at) next.started_at = now;
        if (stage === 'done' && !b.completed_at) {
          next.completed_at = now;
          next.status = 'completed';
        }
        return next;
      })
    );

    try {
      const res = await fetch('/api/admin/update-stage', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ bookingId, stage }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || 'Update failed');
      }
    } catch (err: any) {
      setBookings(prev);
      setActionError(err.message || 'Update failed');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleMarkDeposit = async (bookingId: string, paid: boolean) => {
    if (!session?.access_token) return;
    if (!paid && !window.confirm('Mark this deposit as unpaid? The customer will see the booking as pending again.')) {
      return;
    }
    setUpdatingId(bookingId);
    setActionError(null);

    // Optimistic update so the UI reflects the change instantly even if
    // Supabase Realtime isn't enabled on the bookings table.
    const prev = bookings;
    setBookings((list) =>
      list.map((b) =>
        b.id === bookingId
          ? {
              ...b,
              deposit_paid: paid,
              status: paid
                ? b.status === 'approved' || b.status === 'pending'
                  ? 'confirmed'
                  : b.status
                : b.status === 'confirmed'
                ? 'approved'
                : b.status,
            }
          : b
      )
    );

    try {
      const res = await fetch('/api/admin/mark-deposit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ bookingId, paid }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || 'Update failed');
      }
    } catch (err: any) {
      // Roll back on failure.
      setBookings(prev);
      setActionError(err.message || 'Update failed');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleApprove = async (bookingId: string) => {
    if (!session?.access_token) return;
    setUpdatingId(bookingId);
    setActionError(null);

    // Optimistic — flip to 'approved' immediately. The Square payment URL
    // comes back in the response; we patch it in once we have it.
    const prev = bookings;
    const now = new Date().toISOString();
    setBookings((list) =>
      list.map((b) =>
        b.id === bookingId ? { ...b, status: 'approved', approved_at: now } : b
      )
    );

    try {
      const res = await fetch('/api/admin/approve', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ bookingId, origin: window.location.origin }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body?.error || 'Approve failed');
      }
      const paymentUrl: string | undefined = body?.paymentUrl;
      if (paymentUrl) {
        setBookings((list) =>
          list.map((b) => (b.id === bookingId ? { ...b, payment_url: paymentUrl } : b))
        );
      }
      setActionSuccess('Booking approved — Square deposit link sent.');
    } catch (err: any) {
      setBookings(prev);
      setActionError(err.message || 'Approve failed');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDelete = async (bookingId: string) => {
    if (!session?.access_token) return;
    if (
      !window.confirm(
        'Permanently delete this booking? This wipes the row from the database — there is no undo.'
      )
    ) {
      return;
    }
    setUpdatingId(bookingId);
    setActionError(null);
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
      // Realtime will refresh; clear optimistically too.
      setBookings((prev) => prev.filter((b) => b.id !== bookingId));
      if (expandedId === bookingId) setExpandedId(null);
    } catch (err: any) {
      setActionError(err.message || 'Delete failed');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDecline = async (bookingId: string) => {
    if (!session?.access_token) return;
    const reason = (declineReasonDraft[bookingId] ?? '').trim();
    if (!window.confirm('Decline this booking? The customer will be notified and the slot will reopen.')) {
      return;
    }
    setUpdatingId(bookingId);
    setActionError(null);

    // Optimistic — mark declined and stash the reason so the slot frees up
    // and the row moves out of the active list immediately.
    const prevBookings = bookings;
    const now = new Date().toISOString();
    setBookings((list) =>
      list.map((b) =>
        b.id === bookingId
          ? {
              ...b,
              status: 'declined',
              decline_reason: reason || null,
              declined_at: now,
            }
          : b
      )
    );

    try {
      const res = await fetch('/api/admin/decline', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ bookingId, reason }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || 'Decline failed');
      }
      setDeclineReasonDraft((prev) => {
        const next = { ...prev };
        delete next[bookingId];
        return next;
      });
      setActionSuccess('Booking declined — slot freed.');
    } catch (err: any) {
      setBookings(prevBookings);
      setActionError(err.message || 'Decline failed');
    } finally {
      setUpdatingId(null);
    }
  };

  if (authLoading || isAdmin === null) {
    return (
      <main className="min-h-screen bg-black px-6 py-16 text-white">
        <div className="flex items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-red-600 border-t-transparent" />
        </div>
      </main>
    );
  }

  if (!isAdmin) {
    return (
      <main className="min-h-screen bg-black px-6 py-16 text-white">
        <div className="mx-auto max-w-md rounded-3xl border border-white/10 bg-white/5 p-8 text-center">
          <h1 className="mb-2 text-2xl font-bold">Not authorized</h1>
          <p className="mb-6 text-sm text-gray-400">
            You don&apos;t have admin access to this workspace.
          </p>
          <Link href="/dashboard" className="inline-block rounded-lg bg-red-600 px-6 py-2 hover:bg-red-700">
            Back to Dashboard
          </Link>
        </div>
      </main>
    );
  }

  const pendingCount = bookings.filter((b) => b.status === 'pending').length;

  const visible = bookings.filter((b) => {
    const status: Status = b.status ?? 'pending';
    if (filter === 'pending') return status === 'pending';
    if (filter === 'active') return status !== 'declined' && status !== 'completed';
    return true;
  });

  return (
    <main className="min-h-screen bg-black px-6 py-12 text-white">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold uppercase tracking-[0.18em]">Admin</h1>
            <p className="text-sm text-gray-400">{user?.email}</p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="rounded-lg border border-gray-600 px-4 py-2 text-sm text-gray-300 hover:bg-gray-800"
            >
              Customer view
            </Link>
            <button
              onClick={async () => {
                await signOut();
                router.push('/auth');
              }}
              className="rounded-lg border border-gray-600 px-4 py-2 text-sm text-gray-300 hover:bg-gray-800"
            >
              Sign Out
            </button>
          </div>
        </div>

        <DailyCapacityPanel session={session} />

        {user && (
          <GoogleCalendarSubscribe
            adminUserId={user.id}
            accessToken={session?.access_token ?? null}
          />
        )}

        {user && (
          <ManageAdmins
            currentAdminId={user.id}
            accessToken={session?.access_token ?? null}
          />
        )}

        <ManagePromoCodes accessToken={session?.access_token ?? null} />

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFilter('pending')}
            className={`rounded-full px-4 py-1.5 text-sm ${
              filter === 'pending' ? 'bg-red-600 text-white' : 'bg-gray-800 text-gray-300'
            }`}
          >
            Pending {pendingCount > 0 && `(${pendingCount})`}
          </button>
          <button
            onClick={() => setFilter('active')}
            className={`rounded-full px-4 py-1.5 text-sm ${
              filter === 'active' ? 'bg-red-600 text-white' : 'bg-gray-800 text-gray-300'
            }`}
          >
            Active
          </button>
          <button
            onClick={() => setFilter('all')}
            className={`rounded-full px-4 py-1.5 text-sm ${
              filter === 'all' ? 'bg-red-600 text-white' : 'bg-gray-800 text-gray-300'
            }`}
          >
            All
          </button>
        </div>

        {loadError && (
          <div className="rounded-lg border border-red-700 bg-red-900/40 p-3 text-sm text-red-200">
            <p className="font-semibold">Failed to load bookings</p>
            <p className="mt-1 text-xs text-red-300/80">{loadError}</p>
          </div>
        )}

        {actionError && (
          <div className="rounded-lg border border-red-700 bg-red-900/40 p-3 text-sm text-red-200">
            {actionError}
          </div>
        )}

        {actionSuccess && (
          <div
            role="status"
            className="animate-fade-up rounded-lg border border-green-700 bg-green-900/30 p-3 text-sm text-green-200"
          >
            {actionSuccess}
          </div>
        )}

        {loading ? (
          <div className="h-32 animate-pulse rounded-lg bg-gray-800" />
        ) : visible.length === 0 ? (
          <div className="rounded-lg border border-dashed border-gray-700 p-8 text-center text-gray-400">
            {filter === 'active' ? 'No active bookings.' : 'No bookings yet.'}
          </div>
        ) : (
          <div className="space-y-3">
            {visible.map((b) => {
              const isExpanded = expandedId === b.id;
              const addonNames = formatAddons(b.addons);
              return (
                <div
                  key={b.id}
                  className="rounded-lg border border-gray-700 bg-gray-900"
                >
                  <button
                    type="button"
                    onClick={() => setExpandedId(isExpanded ? null : b.id)}
                    className="flex w-full flex-wrap items-start justify-between gap-3 p-5 text-left hover:bg-gray-800/40"
                  >
                    <div>
                      <p className="font-semibold text-white">
                        {b.service}
                        {b.customer?.full_name && (
                          <span className="ml-2 text-sm font-normal text-gray-400">
                            · {b.customer.full_name}
                          </span>
                        )}
                      </p>
                      <p className="text-sm text-gray-400">
                        {new Date(b.scheduled_at).toLocaleString()}
                      </p>
                      <p className="text-xs text-gray-500">
                        {b.address}, {b.city}, {b.state} {b.zip}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1 text-right text-xs">
                      <span
                        className={`rounded-full border px-2 py-0.5 font-medium ${
                          STATUS_BADGES[(b.status ?? 'pending') as Status].className
                        }`}
                      >
                        {STATUS_BADGES[(b.status ?? 'pending') as Status].label}
                        {b.is_ceramic && ' · ceramic'}
                      </span>
                      <span className="text-gray-400">
                        ${Number(b.deposit_amount).toFixed(2)} of ${Number(b.total).toFixed(2)}
                      </span>
                      {b.status !== 'pending' && b.status !== 'declined' && (
                        <span className="text-red-400">
                          Stage: {STAGE_LABELS[normalizeStage(b.booking_stage)]}
                        </span>
                      )}
                      <span className="text-gray-500">
                        {isExpanded ? '▲ Hide details' : '▼ Show details'}
                      </span>
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="border-t border-gray-700 px-5 py-5">
                      <div className="grid gap-5 md:grid-cols-2">
                        <div>
                          <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                            Customer
                          </h3>
                          <p className="mt-2 text-white">
                            {b.customer?.full_name || <span className="text-gray-500">Name not set</span>}
                          </p>
                          <p className="text-sm text-gray-400">
                            {b.customer?.email || 'Email unavailable'}
                          </p>
                          <p className="text-sm text-gray-400">
                            {b.customer?.phone || 'No phone on file'}
                          </p>
                        </div>

                        <div>
                          <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                            Vehicle
                          </h3>
                          {b.vehicle ? (
                            <>
                              <p className="mt-2 text-white">
                                {b.vehicle.year} {b.vehicle.make} {b.vehicle.model}
                                {b.vehicle.nickname && (
                                  <span className="ml-1 text-sm text-gray-400">
                                    · {b.vehicle.nickname}
                                  </span>
                                )}
                              </p>
                              <p className="text-sm text-gray-400">
                                {b.vehicle.color || 'Color not set'} · {SIZE_LABELS[b.vehicle.size] ?? b.vehicle.size}
                              </p>
                            </>
                          ) : (
                            <p className="mt-2 text-sm text-gray-500">Vehicle was deleted</p>
                          )}
                        </div>

                        <div>
                          <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                            Scheduled
                          </h3>
                          <p className="mt-2 text-white">
                            {new Date(b.scheduled_at).toLocaleString()}
                          </p>
                        </div>

                        <div>
                          <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                            Service address
                          </h3>
                          <p className="mt-2 text-white">{b.address}</p>
                          <p className="text-sm text-gray-400">
                            {b.city}, {b.state} {b.zip}
                          </p>
                        </div>

                        <div>
                          <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                            Add-ons
                          </h3>
                          {addonNames.length === 0 ? (
                            <p className="mt-2 text-sm text-gray-500">None</p>
                          ) : (
                            <ul className="mt-2 list-inside list-disc text-sm text-gray-300">
                              {addonNames.map((name, i) => (
                                <li key={i}>{name}</li>
                              ))}
                            </ul>
                          )}
                        </div>

                        <div>
                          <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                            Payment
                          </h3>
                          <p
                            className={`mt-2 font-semibold ${
                              b.deposit_paid ? 'text-green-400' : 'text-yellow-300'
                            }`}
                          >
                            {b.deposit_paid ? 'Deposit paid' : 'Awaiting deposit'}
                          </p>
                          <div className="mt-1 space-y-0.5 text-sm text-gray-400">
                            <div className="flex justify-between">
                              <span>Subtotal</span>
                              <span>${Number(b.subtotal).toFixed(2)}</span>
                            </div>
                            {Number(b.discount_amount) > 0 && (
                              <div className="flex justify-between text-green-400">
                                <span>Returning customer −10%</span>
                                <span>−${Number(b.discount_amount).toFixed(2)}</span>
                              </div>
                            )}
                            <div className="flex justify-between text-white font-semibold">
                              <span>Total</span>
                              <span>${Number(b.total).toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Deposit</span>
                              <span>${Number(b.deposit_amount).toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Balance due on site</span>
                              <span>${(Number(b.total) - Number(b.deposit_amount)).toFixed(2)}</span>
                            </div>
                          </div>
                          <button
                            type="button"
                            disabled={updatingId === b.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMarkDeposit(b.id, !b.deposit_paid);
                            }}
                            className={`mt-3 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50 ${
                              b.deposit_paid
                                ? 'border border-gray-600 text-gray-300 hover:bg-gray-800'
                                : 'bg-green-600 text-white hover:bg-green-700'
                            }`}
                          >
                            {updatingId === b.id
                              ? 'Saving…'
                              : b.deposit_paid
                              ? 'Mark deposit unpaid'
                              : 'Mark deposit paid'}
                          </button>
                        </div>

                        <div>
                          <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                            Timing
                          </h3>
                          <p className="mt-2 text-sm text-gray-300">
                            Started:{' '}
                            {b.started_at
                              ? new Date(b.started_at).toLocaleString()
                              : <span className="text-gray-500">Not started</span>}
                          </p>
                          <p className="text-sm text-gray-300">
                            Completed:{' '}
                            {b.completed_at
                              ? new Date(b.completed_at).toLocaleString()
                              : <span className="text-gray-500">Not completed</span>}
                          </p>
                        </div>

                        {b.status === 'pending' && (
                          <div className="md:col-span-2">
                            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                              Approval
                            </h3>
                            <p className="mt-2 text-sm text-gray-300">
                              Approving creates a Square deposit link for the customer.
                              Declining frees the slot.
                            </p>
                            <textarea
                              value={declineReasonDraft[b.id] ?? ''}
                              onChange={(e) =>
                                setDeclineReasonDraft((prev) => ({
                                  ...prev,
                                  [b.id]: e.target.value,
                                }))
                              }
                              placeholder="Optional decline reason (only sent if you decline)"
                              rows={2}
                              className="mt-3 w-full rounded-lg border border-gray-600 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-red-500 focus:outline-none"
                              onClick={(e) => e.stopPropagation()}
                            />
                            <div className="mt-3 flex flex-wrap gap-2">
                              <button
                                type="button"
                                disabled={updatingId === b.id}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleApprove(b.id);
                                }}
                                className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50"
                              >
                                {updatingId === b.id ? 'Approving…' : 'Approve'}
                              </button>
                              <button
                                type="button"
                                disabled={updatingId === b.id}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDecline(b.id);
                                }}
                                className="rounded-lg border border-red-600 px-4 py-2 text-sm font-semibold text-red-400 hover:bg-red-900/30 disabled:opacity-50"
                              >
                                {updatingId === b.id ? 'Declining…' : 'Decline'}
                              </button>
                            </div>
                          </div>
                        )}

                        {b.status === 'declined' && (
                          <div className="md:col-span-2 rounded-lg border border-red-700 bg-red-900/20 p-4">
                            <p className="text-sm font-semibold text-red-300">Declined</p>
                            {b.decline_reason && (
                              <p className="mt-1 text-sm text-red-200">
                                Reason: {b.decline_reason}
                              </p>
                            )}
                            {b.declined_at && (
                              <p className="mt-1 text-xs text-red-300/80">
                                {new Date(b.declined_at).toLocaleString()}
                              </p>
                            )}
                          </div>
                        )}

                        {b.status === 'approved' && b.payment_url && (
                          <div className="md:col-span-2 rounded-lg border border-blue-700 bg-blue-900/20 p-4">
                            <p className="text-sm font-semibold text-blue-300">
                              Awaiting customer deposit
                            </p>
                            <p className="mt-1 text-xs text-blue-200/80">
                              Customer can pay via the booking confirmation page or this link:
                            </p>
                            <a
                              href={b.payment_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="mt-2 block break-all text-xs text-blue-400 underline"
                            >
                              {b.payment_url}
                            </a>
                          </div>
                        )}

                        {b.status !== 'pending' && b.status !== 'declined' && (
                          <div className="md:col-span-2">
                            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                              Stage
                            </h3>
                            <div className="mt-2 flex flex-wrap gap-2">
                              {getStagesForBooking(b.addons).map((s) => {
                                const isCurrent = normalizeStage(b.booking_stage) === s;
                                const isUpdating = updatingId === b.id;
                                return (
                                  <button
                                    key={s}
                                    disabled={isUpdating || isCurrent}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleStageChange(b.id, s);
                                    }}
                                    className={`rounded-full px-3 py-1 text-xs transition-colors ${
                                      isCurrent
                                        ? 'bg-red-600 text-white'
                                        : 'border border-gray-600 text-gray-300 hover:bg-gray-800'
                                    } disabled:opacity-50`}
                                  >
                                    {isUpdating && !isCurrent ? 'Saving…' : STAGE_LABELS[s]}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        <div className="md:col-span-2 mt-2 border-t border-gray-800 pt-4">
                          <h3 className="text-xs font-semibold uppercase tracking-wider text-red-500">
                            Danger zone
                          </h3>
                          <p className="mt-2 text-xs text-gray-400">
                            Permanently deletes the booking row. Use for test data or duplicates only.
                          </p>
                          <button
                            type="button"
                            disabled={updatingId === b.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(b.id);
                            }}
                            className="mt-3 rounded-lg border border-red-700 px-3 py-1.5 text-xs font-medium text-red-400 hover:bg-red-900/30 disabled:opacity-50"
                          >
                            {updatingId === b.id ? 'Deleting…' : 'Delete booking'}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
