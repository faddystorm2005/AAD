'use client';

import { use, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import { getBooking } from '@/lib/bookingService';
import { SERVICE_TYPE_NAMES, ServiceType } from '@/lib/bookingPricing';
import { errorMessage } from '@/lib/errors';

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
  promo_code_used?: string | null;
  decline_reason: string | null;
  photo_permission?: boolean | null;
}

const STATUS_HEADER: Record<BookingStatus, { title: string; subtitle: string; tone: 'yellow' | 'green' | 'red' | 'blue' }> = {
  pending: {
    title: 'Request received',
    subtitle: "Signature Mobile Detailing is reviewing your request. We'll text you shortly to lock in a time. No charge now.",
    tone: 'yellow',
  },
  approved: {
    title: "You're approved!",
    subtitle: "We'll text you shortly to arrange a time that works. No deposit - you pay on-site when the detail is done.",
    tone: 'green',
  },
  declined: {
    title: 'Request declined',
    subtitle: "Unfortunately we couldn't accommodate this request.",
    tone: 'red',
  },
  confirmed: {
    title: 'Booking confirmed!',
    subtitle: 'See you on the day of service. You pay on-site when the detail is done.',
    tone: 'green',
  },
  in_progress: {
    title: 'Service in progress',
    subtitle: "Signature Mobile Detailing is working on your car right now.",
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
    border: 'border-gold-700',
    bg: 'bg-gold-900/20',
    title: 'text-gold-400',
    sub: 'text-gold-200',
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
      } catch (err) {
        if (!cancelled) {
          setError(errorMessage(err, 'An error occurred'));
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [bookingId]);

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

  if (loading) {
    return (
      <main className="min-h-screen bg-black px-6 py-16 text-white">
        <div className="flex min-h-screen items-center justify-center">
          <div className="text-center">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-gold-600 border-t-transparent"></div>
            <p className="mt-4 text-sm text-gray-300">Loading your booking...</p>
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
                className="inline-block rounded-lg bg-gold-600 px-6 py-3 font-semibold text-black hover:bg-gold-700"
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

          {status === 'approved' && (
            <p className="mt-5 rounded-xl border-2 border-green-700 bg-green-900/30 p-4 text-base text-green-100">
              We&apos;ll text you shortly to lock in a time that works. No deposit needed. You pay on-site once the detail is done.
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
                  <p className="mt-0.5 text-xs text-gray-300">We&apos;ll push an alert when your request is approved and when the service is complete.</p>
                </div>
                <button
                  type="button"
                  onClick={handleEnablePush}
                  disabled={pushState === 'working'}
                  className="shrink-0 rounded-lg bg-gold-600 px-4 py-2 text-sm font-semibold text-black hover:bg-gold-700 disabled:opacity-50"
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
            <p className="mt-1 break-all font-mono text-sm text-white sm:text-base">{booking.id}</p>
          </div>

          <div>
            <p className="text-sm uppercase tracking-wider text-gray-300">Service</p>
            <p className="mt-1 text-base text-white">
              {SERVICE_TYPE_NAMES[booking.service_type ?? 'full_detail']}
            </p>
          </div>

          <div>
            <p className="text-sm uppercase tracking-wider text-gray-300">Appointment time</p>
            <p className="mt-1 text-lg font-semibold text-white">
              We&apos;ll text you to arrange a time
            </p>
          </div>

          <div>
            <p className="text-sm uppercase tracking-wider text-gray-300">We&apos;ll come to</p>
            <p className="mt-1 break-words text-base text-white">
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
                  <span>
                    {booking.promo_code_used
                      ? `Promo "${booking.promo_code_used}"`
                      : 'Returning customer discount'}
                  </span>
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
              No deposit needed. You pay{' '}
              <span className="font-bold text-white">${Number(booking.total).toFixed(2)}</span>{' '}
              on-site when the detail is done.
            </p>
          </div>

          <div>
            <p className="text-sm uppercase tracking-wider text-gray-300">Photo Permission</p>
            <p className="mt-1 text-base text-white">
              {booking.photo_permission
                ? 'Granted - Signature Mobile Detailing may use photos for marketing'
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
