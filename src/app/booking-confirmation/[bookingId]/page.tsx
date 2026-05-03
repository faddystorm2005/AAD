'use client';

import { use, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import { getBooking } from '@/lib/bookingService';
import { SERVICE_TYPE_NAMES, ServiceType } from '@/lib/bookingPricing';

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
  service_type?: ServiceType | null;
  scheduled_at: string;
  address: string;
  unit: string | null;
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
  photo_permission?: boolean | null;
}

const STATUS_HEADER: Record<BookingStatus, { title: string; subtitle: string; tone: 'yellow' | 'green' | 'red' | 'blue' }> = {
  pending: {
    title: 'Pending approval',
    subtitle: "Austin Auto Detail is reviewing your booking. We'll notify you within 24 hours. No charge yet.",
    tone: 'yellow',
  },
  approved: {
    title: 'Approved - pay deposit',
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

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

export default function BookingConfirmationPage({ params }: BookingConfirmationPageProps) {
  const { bookingId } = use(params);
  const [booking, setBooking] = useState<ConfirmationBooking | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pushState, setPushState] = useState<'hidden' | 'prompt' | 'working' | 'enabled' | 'denied'>('hidden');
  const pushSubRef = useRef<PushSubscription | null>(null);

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

  // Polling fallback - when the booking is in 'approved' status (waiting on
  // deposit), we hit /api/paypal/check-capture which queries PayPal directly
  // and captures the order if the buyer has approved. If captured, it flips
  // the booking to confirmed in our DB. Then we re-fetch to update the UI.
  // This works even if PayPal webhooks aren't being delivered.
  //
  // We fire ONE immediate tick on mount (so customers returning from PayPal
  // see "Confirmed" within ~2s instead of waiting for the first interval),
  // then poll every 3s as a safety net.
  useEffect(() => {
    if (!booking || booking.status !== 'approved') return;
    let cancelled = false;
    const tick = async () => {
      // Ask PayPal directly via our server. Best-effort - failures are silent.
      try {
        await fetch(`/api/paypal/check-capture?bookingId=${bookingId}`);
      } catch {
        /* ignore */
      }
      if (cancelled) return;
      // Re-load the booking from our DB so the UI reflects whatever
      // check-capture wrote (or didn't write).
      const result = await getBooking(bookingId);
      if (cancelled) return;
      if (result.success && result.booking) {
        setBooking(result.booking as ConfirmationBooking);
      }
    };
    // Fire immediately on mount (catches the post-PayPal redirect fast).
    tick();
    const interval = setInterval(tick, 3000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [booking, bookingId]);

  // Check if push is available and not yet subscribed for this booking.
  // Show the prompt only once the booking has loaded and isn't declined.
  useEffect(() => {
    if (!booking) return;
    if (booking.status === 'declined' || booking.status === 'completed') return;
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
    if (Notification.permission === 'denied') return;

    navigator.serviceWorker.ready.then((reg) => {
      reg.pushManager.getSubscription().then((existing) => {
        if (existing) {
          pushSubRef.current = existing;
          setPushState('enabled');
        } else {
          setPushState('prompt');
        }
      });
    });
  }, [booking?.id, booking?.status]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleEnablePush = async () => {
    setPushState('working');
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (!token) { setPushState('prompt'); return; }

      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setPushState(permission === 'denied' ? 'denied' : 'prompt');
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      });
      pushSubRef.current = sub;
      await fetch('/api/push-subscribe/customer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          bookingId,
          subscription: sub.toJSON(),
          userAgent: navigator.userAgent,
        }),
      });
      setPushState('enabled');
    } catch {
      setPushState('prompt');
    }
  };

  const handleManualRefresh = async () => {
    // Customer clicked "I paid - check now". First ask PayPal directly,
    // then refresh from DB.
    try {
      await fetch(`/api/paypal/check-capture?bookingId=${bookingId}`);
    } catch {
      /* ignore */
    }
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
            <div className="flex flex-col gap-3">
              <button
                type="button"
                onClick={() => {
                  setError('');
                  setLoading(true);
                  getBooking(bookingId).then((result) => {
                    if (result.success && result.booking) {
                      setBooking(result.booking as ConfirmationBooking);
                    } else {
                      setError('Still unable to load booking.');
                    }
                    setLoading(false);
                  });
                }}
                className="inline-block rounded-lg bg-red-600 px-6 py-3 font-semibold text-white hover:bg-red-700"
              >
                Try again
              </button>
              <Link
                href="/dashboard"
                className="inline-block rounded-lg border border-white/20 px-6 py-3 text-gray-300 hover:text-white"
              >
                Back to Dashboard
              </Link>
            </div>
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
        <div className={`glass-card animate-scale-in rounded-3xl border ${tone.border} ${tone.bg} p-8 text-center`}>
          {status === 'confirmed' && (
            <div className="mb-4 flex justify-center">
              <svg
                width="56"
                height="56"
                viewBox="0 0 56 56"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden
              >
                <circle cx="28" cy="28" r="26" stroke="rgba(34,197,94,0.4)" strokeWidth="2" />
                <path
                  d="M16 28.5 L25 37 L41 20"
                  stroke="#4ade80"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="animate-check-draw"
                />
              </svg>
            </div>
          )}
          <h1 className={`mb-3 text-2xl font-bold sm:text-3xl ${tone.title}`}>{header.title}</h1>
          <p className={`text-base ${tone.sub}`}>{header.subtitle}</p>

          {status === 'declined' && booking.decline_reason && (
            <p className="mt-4 rounded-xl border-2 border-red-700 bg-red-900/40 p-4 text-base text-red-100">
              <span className="font-semibold">Reason:</span> {booking.decline_reason}
            </p>
          )}

          {status === 'approved' && booking.payment_url && (
            <div className="mt-5 flex flex-col items-center gap-3">
              <a
                href={booking.payment_url}
                target="_blank"
                rel="noopener noreferrer"
                className="press inline-block rounded-xl bg-blue-600 px-7 py-4 text-base font-semibold text-white shadow-lg shadow-blue-900/40 hover:bg-blue-700 sm:text-lg"
              >
                Pay ${Number(booking.deposit_amount).toFixed(2)} deposit →
              </a>
              <div className="flex items-center gap-2 text-sm text-blue-200">
                <span className="inline-block h-2 w-2 animate-pulse-soft rounded-full bg-blue-400" />
                <span>Checking for payment every 3 seconds…</span>
              </div>
              <button
                type="button"
                onClick={handleManualRefresh}
                className="press rounded-lg border border-blue-500/40 bg-blue-950/40 px-4 py-2 text-sm font-semibold text-blue-100 hover:bg-blue-900/40"
              >
                I paid &mdash; check now
              </button>
            </div>
          )}

          {status === 'approved' && !booking.payment_url && (
            <p className="mt-5 rounded-xl border-2 border-blue-700 bg-blue-900/40 p-4 text-base text-blue-100">
              The payment link is being set up. Refresh in a moment, or reach out if it doesn&apos;t appear.
            </p>
          )}
        </div>

        {(pushState === 'prompt' || pushState === 'working' || pushState === 'enabled') && (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            {pushState === 'enabled' ? (
              <div className="flex items-center gap-2 text-sm text-green-400">
                <span className="inline-block h-2 w-2 rounded-full bg-green-400" />
                Notifications enabled - we&apos;ll alert you when your booking status changes.
              </div>
            ) : (
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-white">Get notified about your booking</p>
                  <p className="mt-0.5 text-xs text-gray-400">We&apos;ll push an alert when approved, deposit confirmed, or service complete.</p>
                </div>
                <button
                  type="button"
                  onClick={handleEnablePush}
                  disabled={pushState === 'working'}
                  className="shrink-0 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                >
                  {pushState === 'working' ? 'Enabling...' : 'Allow notifications'}
                </button>
              </div>
            )}
          </div>
        )}

        <div className="glass-card space-y-5 rounded-3xl p-6 sm:p-8">
          <div>
            <p className="text-sm uppercase tracking-wider text-gray-300">Booking ID</p>
            <p className="mt-1 font-mono text-base text-white sm:text-lg">{booking.id}</p>
          </div>

          <div>
            <p className="text-sm uppercase tracking-wider text-gray-300">Service</p>
            <p className="mt-1 text-base text-white">
              {SERVICE_TYPE_NAMES[booking.service_type ?? 'full_detail']}
            </p>
          </div>

          <div>
            <p className="text-sm uppercase tracking-wider text-gray-300">Scheduled for</p>
            <p className="mt-1 text-lg font-semibold text-white">
              {new Date(booking.scheduled_at).toLocaleString()}
            </p>
          </div>

          <div>
            <p className="text-sm uppercase tracking-wider text-gray-300">We&apos;ll come to</p>
            <p className="mt-1 text-base text-white">
              {booking.address}{booking.unit ? ` ${booking.unit}` : ''}, {booking.city}, {booking.state} {booking.zip}
            </p>
          </div>

          <div className="border-t border-gray-600 pt-5">
            <p className="mb-3 text-sm uppercase tracking-wider text-gray-300">Cost Summary</p>
            <div className="space-y-2">
              <div className="flex justify-between text-base text-gray-200">
                <span>Subtotal</span>
                <span>${Number(booking.subtotal).toFixed(2)}</span>
              </div>
              {Number(booking.discount_amount) > 0 && (
                <div className="flex justify-between text-base text-green-300">
                  <span>Returning customer &minus;10%</span>
                  <span>&minus;${Number(booking.discount_amount).toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-xl font-bold text-white pt-2 border-t border-gray-700">
                <span>Total</span>
                <span>${Number(booking.total).toFixed(2)}</span>
              </div>
            </div>
          </div>

          <div className="rounded-xl bg-gray-800 border border-gray-700 p-4">
            <p className="text-base text-gray-100">
              Deposit:{' '}
              <span
                className={`font-bold ${
                  booking.deposit_paid ? 'text-green-300' : 'text-yellow-200'
                }`}
              >
                ${Number(booking.deposit_amount).toFixed(2)}{' '}
                {booking.deposit_paid ? '(paid)' : '(pending)'}
              </span>
            </p>
            <p className="mt-2 text-base text-gray-200">
              Balance due on-site:{' '}
              <span className="font-bold text-white">
                ${(Number(booking.total) - Number(booking.deposit_amount)).toFixed(2)}
              </span>
            </p>
          </div>

          <div>
            <p className="text-sm uppercase tracking-wider text-gray-300">Photo Permission</p>
            <p className="mt-1 text-base text-white">
              {booking.photo_permission
                ? 'Granted - Austin Auto Detail may use photos for marketing'
                : 'Not granted'}
            </p>
          </div>
        </div>

        <Link
          href="/dashboard"
          className="btn-primary press block rounded-xl px-6 py-4 text-center text-base font-semibold sm:text-lg"
        >
          Back to dashboard
        </Link>
      </div>
    </main>
  );
}
