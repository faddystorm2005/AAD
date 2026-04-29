'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import { getBooking } from '@/lib/bookingService';

type BookingStatus =
  | 'pending'
  | 'approved'
  | 'declined'
  | 'confirmed'
  | 'in_progress'
  | 'completed';

interface BookingConfirmationPageProps {
  params: Promise<{ bookingId: string }>;
}

interface ConfirmationBooking {
  id: string;
  status: BookingStatus;
  scheduled_at: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  subtotal: number;
  total: number;
  deposit_amount: number;
  deposit_paid: boolean;
  discount_amount: number;
  decline_reason: string | null;
  payment_url: string | null;
}

const STATUS_HEADER: Record<BookingStatus, { title: string; subtitle: string; tone: 'yellow' | 'green' | 'red' | 'blue' }> = {
  pending: {
    title: 'Pending approval',
    subtitle: "Austin Auto Detail is reviewing your booking. We'll notify you within 24 hours. No charge yet.",
    tone: 'yellow',
  },
  approved: {
    title: 'Approved — pay deposit',
    subtitle: 'Your booking was approved. Pay the $30 deposit below to lock in your slot.',
    tone: 'blue',
  },
  declined: {
    title: 'Booking declined',
    subtitle: "Unfortunately we couldn't accommodate this booking.",
    tone: 'red',
  },
  confirmed: {
    title: 'Booking confirmed!',
    subtitle: 'Deposit received. See you on the day of service.',
    tone: 'green',
  },
  in_progress: {
    title: 'Service in progress',
    subtitle: "Austin Auto Detail is working on your car right now.",
    tone: 'green',
  },
  completed: {
    title: 'Service complete',
    subtitle: 'Thanks! Hope to see you again.',
    tone: 'green',
  },
};

const TONE_CLASSES: Record<'yellow' | 'green' | 'red' | 'blue', { border: string; bg: string; title: string; sub: string }> = {
  yellow: {
    border: 'border-yellow-700',
    bg: 'bg-yellow-900/20',
    title: 'text-yellow-300',
    sub: 'text-yellow-200',
  },
  green: {
    border: 'border-green-700',
    bg: 'bg-green-900/20',
    title: 'text-green-400',
    sub: 'text-green-200',
  },
  red: {
    border: 'border-red-700',
    bg: 'bg-red-900/20',
    title: 'text-red-400',
    sub: 'text-red-200',
  },
  blue: {
    border: 'border-blue-700',
    bg: 'bg-blue-900/20',
    title: 'text-blue-300',
    sub: 'text-blue-200',
  },
};

export default function BookingConfirmationPage({ params }: BookingConfirmationPageProps) {
  const { bookingId } = use(params);
  const [booking, setBooking] = useState<ConfirmationBooking | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    // Create the channel synchronously so cleanup can always remove it.
    // Doing this inside an async function would let React's dev-mode double-mount
    // run cleanup before the channel ref is assigned, leaking the subscription.
    const channel = supabase
      .channel(`booking-${bookingId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'bookings',
          filter: `id=eq.${bookingId}`,
        },
        (payload) => {
          if (!cancelled) setBooking(payload.new as ConfirmationBooking);
        }
      )
      .subscribe();

    (async () => {
      try {
        const result = await getBooking(bookingId);
        if (!result.success || !result.booking) {
          throw new Error('Failed to load booking');
        }
        if (!cancelled) {
          setBooking(result.booking as ConfirmationBooking);
          setLoading(false);
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(err.message || 'An error occurred');
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [bookingId]);

  // Polling fallback — when the booking is in 'approved' status (waiting on
  // deposit), poll every 5s for status changes. This is the safety net for
  // when Supabase Realtime isn't enabled on the bookings table OR when
  // Square's webhook doesn't reach our server. Stops as soon as status
  // moves out of 'approved'.
  useEffect(() => {
    if (!booking || booking.status !== 'approved') return;
    let cancelled = false;
    const tick = async () => {
      const result = await getBooking(bookingId);
      if (cancelled) return;
      if (result.success && result.booking) {
        setBooking(result.booking as ConfirmationBooking);
      }
    };
    const interval = setInterval(tick, 5000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [booking, bookingId]);

  const handleManualRefresh = async () => {
    const result = await getBooking(bookingId);
    if (result.success && result.booking) {
      setBooking(result.booking as ConfirmationBooking);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-black px-6 py-16 text-white">
        <div className="flex min-h-screen items-center justify-center">
          <div className="text-center">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-red-600 border-t-transparent"></div>
            <p className="mt-4 text-sm text-gray-400">Loading your booking...</p>
          </div>
        </div>
      </main>
    );
  }

  if (error || !booking) {
    return (
      <main className="min-h-screen bg-black px-6 py-16 text-white">
        <div className="mx-auto flex w-full max-w-md flex-col gap-6">
          <div className="rounded-3xl border border-red-700 bg-red-900/20 p-8 text-center">
            <h1 className="mb-3 text-2xl font-bold text-red-400">Booking Error</h1>
            <p className="mb-6 text-red-200">{error || 'Booking not found.'}</p>
            <Link
              href="/dashboard"
              className="inline-block rounded-lg bg-red-600 px-6 py-2 text-white hover:bg-red-700"
            >
              Back to Dashboard
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const status: BookingStatus = booking.status ?? 'pending';
  const header = STATUS_HEADER[status];
  const tone = TONE_CLASSES[header.tone];

  return (
    <main className="min-h-screen bg-black px-6 py-16 text-white">
      <div className="mx-auto flex w-full max-w-md flex-col gap-8">
        <div className={`rounded-3xl border ${tone.border} ${tone.bg} p-8 text-center`}>
          <h1 className={`mb-2 text-2xl font-bold ${tone.title}`}>{header.title}</h1>
          <p className={`text-sm ${tone.sub}`}>{header.subtitle}</p>

          {status === 'declined' && booking.decline_reason && (
            <p className="mt-4 rounded-lg bg-red-900/40 p-3 text-sm text-red-200">
              <span className="font-semibold">Reason:</span> {booking.decline_reason}
            </p>
          )}

          {status === 'approved' && booking.payment_url && (
            <div className="mt-5 flex flex-col items-center gap-2">
              <a
                href={booking.payment_url}
                target="_blank"
                rel="noopener noreferrer"
                className="press inline-block rounded-lg bg-blue-600 px-6 py-2.5 font-medium text-white shadow-lg shadow-blue-900/40 hover:bg-blue-700"
              >
                Pay ${Number(booking.deposit_amount).toFixed(2)} deposit →
              </a>
              <p className="text-xs text-blue-300">
                Opens secure checkout in a new tab. This page checks for payment every 5 seconds.
              </p>
              <button
                type="button"
                onClick={handleManualRefresh}
                className="press text-xs text-blue-300 underline hover:text-blue-200"
              >
                I paid — check now
              </button>
            </div>
          )}

          {status === 'approved' && !booking.payment_url && (
            <p className="mt-5 rounded-lg bg-blue-900/40 p-3 text-sm text-blue-200">
              Payment link is being set up. Refresh in a moment, or contact Austin Auto Detail if it doesn&apos;t appear.
            </p>
          )}
        </div>

        <div className="space-y-4 rounded-3xl border border-white/10 bg-white/5 p-8">
          <div>
            <p className="text-sm text-gray-400">Booking ID</p>
            <p className="font-mono text-lg text-white">{booking.id}</p>
          </div>

          <div>
            <p className="text-sm text-gray-400">Scheduled Date</p>
            <p className="text-lg text-white">
              {new Date(booking.scheduled_at).toLocaleString()}
            </p>
          </div>

          <div>
            <p className="text-sm text-gray-400">Service Location</p>
            <p className="text-white">
              {booking.address}, {booking.city}, {booking.state} {booking.zip}
            </p>
          </div>

          <div className="border-t border-gray-600 pt-4">
            <p className="mb-2 text-sm text-gray-400">Cost Summary</p>
            <div className="space-y-1">
              <div className="flex justify-between text-gray-300">
                <span>Subtotal</span>
                <span>${Number(booking.subtotal).toFixed(2)}</span>
              </div>
              {Number(booking.discount_amount) > 0 && (
                <div className="flex justify-between text-green-400">
                  <span>Returning customer −10%</span>
                  <span>−${Number(booking.discount_amount).toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between font-semibold text-white">
                <span>Total</span>
                <span>${Number(booking.total).toFixed(2)}</span>
              </div>
            </div>
          </div>

          <div className="rounded-lg bg-gray-800 p-4">
            <p className="text-sm text-gray-300">
              Deposit:{' '}
              <span
                className={`font-semibold ${
                  booking.deposit_paid ? 'text-green-400' : 'text-yellow-300'
                }`}
              >
                ${Number(booking.deposit_amount).toFixed(2)}{' '}
                {booking.deposit_paid ? '(paid)' : '(pending)'}
              </span>
            </p>
            <p className="mt-1 text-sm text-gray-400">
              Balance Due On-Site:{' '}
              <span className="font-semibold">
                ${(Number(booking.total) - Number(booking.deposit_amount)).toFixed(2)}
              </span>
            </p>
          </div>
        </div>

        <Link
          href="/dashboard"
          className="block rounded-lg bg-red-600 px-6 py-3 text-center font-medium text-white hover:bg-red-700"
        >
          Back to Dashboard
        </Link>
      </div>
    </main>
  );
}
