'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import AddVehicleForm from '@/components/AddVehicleForm';
import VehicleList from '@/components/VehicleList';
import BookingForm from '@/components/BookingForm';
import BookingsList from '@/components/BookingsList';
import GalleryStrip from '@/components/GalleryStrip';
import HeroSpotlight from '@/components/home/HeroSpotlight';
import DashboardStats from '@/components/dashboard/DashboardStats';
import QuickActions from '@/components/dashboard/QuickActions';
import PhonePrompt from '@/components/dashboard/PhonePrompt';
import { supabase } from '@/lib/supabaseClient';
import { BOOK_CTA_IMAGE, DASHBOARD_BANNER } from '@/lib/siteImages';

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

export default function Dashboard() {
  const { user, loading: authLoading, signOut } = useAuth();
  const router = useRouter();
  const [showAddVehicle, setShowAddVehicle] = useState(false);
  const [showBooking, setShowBooking] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [fullName, setFullName] = useState('');
  const [justSignedIn, setJustSignedIn] = useState(false);

  // Auth guard. If the user lands here logged out (stale bookmark, email
  // link clicked after sign-out, etc.) bounce them to /auth so they don't
  // see a half-rendered dashboard with empty queries.
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth');
    }
  }, [authLoading, user, router]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from('profiles')
        .select('is_admin, full_name')
        .eq('id', user.id)
        .maybeSingle();
      setIsAdmin(Boolean(data?.is_admin));
      setFullName(data?.full_name?.trim() ?? '');
    })();
  }, [user]);

  // Post-sign-in handling. /auth/callback tags the redirect with
  //   ?signedIn=1            - show a confirmation toast
  //   ?firstTime=1           - also auto-open the Add Vehicle modal
  // We read window.location.search directly to avoid pulling another
  // <Suspense> wrapper in (Next.js 16 prerender requirement).
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const signedIn = params.get('signedIn') === '1';
    const firstTime = params.get('firstTime') === '1';

    if (signedIn) setJustSignedIn(true);
    if (firstTime) setShowAddVehicle(true);

    if (signedIn || firstTime) {
      // Clean the URL so a refresh doesn't re-fire the toast/modal.
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  // Auto-dismiss the sign-in toast after a few seconds.
  useEffect(() => {
    if (!justSignedIn) return;
    const t = setTimeout(() => setJustSignedIn(false), 4500);
    return () => clearTimeout(t);
  }, [justSignedIn]);

  const handleSignOut = async () => {
    const ok = window.confirm('Sign out of your account?');
    if (!ok) return;
    await signOut();
    router.push('/auth');
  };

  // Greeting depends only on the local hour - memo so a re-render doesn't
  // re-call new Date() (it'd be cheap but pointless churn).
  const greeting = useMemo(() => getGreeting(), []);

  if (authLoading || !user) {
    return null;
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-black text-white">
      {/* Sign-in confirmation toast. Slides down from the top after a fresh
          sign-in so the user gets unmistakable feedback that the magic link
          worked, not just a silent page change. Auto-dismisses after 4.5s. */}
      {justSignedIn && (
        <div
          role="status"
          aria-live="polite"
          className="animate-fade-up fixed left-1/2 top-4 z-50 -translate-x-1/2"
        >
          <div className="flex items-center gap-3 rounded-full border border-green-500/40 bg-green-900/80 px-5 py-3 text-sm shadow-2xl shadow-green-900/40 backdrop-blur-md">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-green-500/20">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-green-300"
                aria-hidden="true"
              >
                <path d="M5 13l4 4L19 7" className="animate-check-draw" />
              </svg>
            </span>
            <div className="text-left">
              <div className="font-semibold text-green-100">You're signed in</div>
              {user?.email && (
                <div className="text-xs text-green-200/80">{user.email}</div>
              )}
            </div>
            <button
              onClick={() => setJustSignedIn(false)}
              className="ml-2 text-green-300/60 hover:text-white"
              aria-label="Dismiss"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Ambient red glow - keeps the page from feeling flat. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-0 h-[600px]"
        style={{
          background:
            'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(214, 32, 48, 0.18), transparent 70%)',
        }}
      />
      {/* Bottom subtle gradient so the page edge feels intentional. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 -z-0 h-[300px]"
        style={{
          background:
            'radial-gradient(ellipse 60% 50% at 50% 100%, rgba(214, 32, 48, 0.08), transparent 70%)',
        }}
      />

      {/* Header banner */}
      <div className="relative h-56 w-full overflow-hidden sm:h-64">
        <img
          src={DASHBOARD_BANNER.src}
          alt={DASHBOARD_BANNER.alt}
          className="absolute inset-0 h-full w-full object-cover animate-banner-pan"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/60 to-black" />
        {/* Cursor-following red glow, same as homepage hero - premium feel. */}
        <HeroSpotlight />
        <div className="relative mx-auto flex h-full w-full max-w-5xl flex-col items-start justify-end gap-3 px-6 pb-6 sm:flex-row sm:items-end sm:justify-between sm:gap-0">
          <div className="animate-fade-up">
            <p className="text-sm font-semibold uppercase tracking-[0.4em] text-red-400">
              {greeting}
            </p>
            <h1 className="text-gradient-hero mt-2 text-3xl font-bold capitalize tracking-[0.04em] sm:text-4xl">
              {fullName || 'Welcome back'}
            </h1>
            <p className="mt-2 text-sm text-gray-200">{user?.email}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2 animate-fade-up sm:gap-3" style={{ animationDelay: '80ms' }}>
            <Link
              href="/"
              className="press rounded-lg border border-white/30 bg-black/40 px-4 py-2.5 text-base font-semibold text-white backdrop-blur hover:bg-black/60"
              title="View public homepage with services and FAQ"
            >
              ← Home
            </Link>
            {isAdmin && (
              <Link
                href="/admin"
                className="press rounded-lg bg-red-600 px-4 py-2.5 text-base font-semibold text-white hover:bg-red-700"
              >
                Admin
              </Link>
            )}
            <Link
              href="/settings"
              className="press rounded-lg border border-white/30 bg-black/40 px-4 py-2.5 text-base font-semibold text-white backdrop-blur hover:bg-black/60"
            >
              Settings
            </Link>
            <button
              onClick={handleSignOut}
              className="press rounded-lg border border-white/30 bg-black/40 px-4 py-2.5 text-base font-semibold text-white backdrop-blur hover:bg-black/60"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>

      <div className="relative z-10 mx-auto flex w-full max-w-5xl flex-col gap-10 px-6 py-10">

        {/* Nag for phone number - persistent banner that nukes itself once
            saved. Phone is required for booking confirmations + day-of texts. */}
        <PhonePrompt />

        {/* Personal stats strip - animated counters with the user's own data. */}
        <div className="reveal-on-scroll animate-fade-up" style={{ animationDelay: '60ms' }}>
          <DashboardStats />
        </div>

        {/* Quick actions - four hover-lift tiles for the most common moves. */}
        <div className="reveal-on-scroll animate-fade-up" style={{ animationDelay: '120ms' }}>
          <h2 className="h-accent mb-4 text-xl font-bold text-white">Quick Actions</h2>
          <QuickActions
            onBook={() => setShowBooking(true)}
            onAddVehicle={() => setShowAddVehicle(true)}
          />
        </div>

        {/* Big book CTA card - full-bleed image with hover lift. */}
        <div
          className="lift-hover relative overflow-hidden rounded-3xl border border-white/10 animate-fade-up"
          style={{ animationDelay: '180ms' }}
        >
          <img
            src={BOOK_CTA_IMAGE.src}
            alt={BOOK_CTA_IMAGE.alt}
            className="absolute inset-0 h-full w-full object-cover animate-banner-pan"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/60 to-black/30" />
          <div className="relative flex flex-col items-start gap-4 p-8 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.35em] text-red-500">
                Quality Over Quantity
              </p>
              <h3 className="mt-2 text-2xl font-bold text-white">
                Ready for your next detail?
              </h3>
              <p className="mt-1 max-w-md text-sm text-gray-300">
                Pick a slot, we&apos;ll come to you. $30 deposit holds it.
              </p>
            </div>
            <button
              onClick={() => setShowBooking(true)}
              className="btn-primary press shrink-0 rounded-lg px-5 py-3 text-sm font-semibold"
            >
              Book a Detail →
            </button>
          </div>
        </div>

        {/* Vehicles */}
        <div className="reveal-on-scroll space-y-4 animate-fade-up" style={{ animationDelay: '240ms' }}>
          <div className="flex items-center justify-between">
            <h2 className="h-accent text-xl font-bold text-white">My Vehicles</h2>
            <button
              onClick={() => setShowAddVehicle(true)}
              className="btn-primary press rounded-lg px-4 py-2 text-sm font-medium"
            >
              + Add Vehicle
            </button>
          </div>
          <VehicleList />
        </div>

        {/* Bookings */}
        <div className="reveal-on-scroll space-y-4 animate-fade-up" style={{ animationDelay: '300ms' }}>
          <h2 className="h-accent text-xl font-bold text-white">Your Bookings</h2>
          <BookingsList />
        </div>

        {/* Gallery */}
        <div className="reveal-on-scroll animate-fade-up" style={{ animationDelay: '380ms' }}>
          <GalleryStrip />
        </div>
      </div>

      {showAddVehicle && <AddVehicleForm onClose={() => setShowAddVehicle(false)} />}
      {showBooking && <BookingForm onClose={() => setShowBooking(false)} />}
    </main>
  );
}