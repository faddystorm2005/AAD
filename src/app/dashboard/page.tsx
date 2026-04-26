'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import AddVehicleForm from '@/components/AddVehicleForm';
import VehicleList from '@/components/VehicleList';
import BookingForm from '@/components/BookingForm';
import BookingsList from '@/components/BookingsList';
import GalleryStrip from '@/components/GalleryStrip';
import { supabase } from '@/lib/supabaseClient';
import { BOOK_CTA_IMAGE, DASHBOARD_BANNER } from '@/lib/siteImages';

export default function Dashboard() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const [showAddVehicle, setShowAddVehicle] = useState(false);
  const [showBooking, setShowBooking] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', user.id)
        .maybeSingle();
      setIsAdmin(Boolean(data?.is_admin));
    })();
  }, [user]);

  const handleSignOut = async () => {
    await signOut();
    router.push('/auth');
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-black text-white">
      {/* Ambient red glow — keeps the page from feeling flat. */}
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
      <div className="relative h-48 w-full overflow-hidden sm:h-56">
        <img
          src={DASHBOARD_BANNER.src}
          alt={DASHBOARD_BANNER.alt}
          className="absolute inset-0 h-full w-full object-cover animate-banner-pan"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/60 to-black" />
        <div className="relative mx-auto flex h-full w-full max-w-5xl items-end justify-between px-6 pb-6">
          <div className="animate-fade-up">
            <h1 className="text-2xl font-bold uppercase tracking-[0.18em] text-white">
              Welcome back
            </h1>
            <p className="text-sm text-gray-300">{user?.email}</p>
          </div>
          <div className="flex items-center gap-3 animate-fade-up" style={{ animationDelay: '80ms' }}>
            {isAdmin && (
              <Link
                href="/admin"
                className="press rounded-lg bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700"
              >
                Admin
              </Link>
            )}
            <Link
              href="/settings"
              className="press rounded-lg border border-white/30 bg-black/30 px-4 py-2 text-sm text-white backdrop-blur hover:bg-black/50"
            >
              Settings
            </Link>
            <button
              onClick={handleSignOut}
              className="press rounded-lg border border-white/30 bg-black/30 px-4 py-2 text-sm text-white backdrop-blur hover:bg-black/50"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>

      <div className="relative z-10 mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-10">

        {/* Vehicles Section */}
        <div className="space-y-4 animate-fade-up" style={{ animationDelay: '120ms' }}>
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white">My Vehicles</h2>
            <button
              onClick={() => setShowAddVehicle(true)}
              className="press rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
            >
              + Add Vehicle
            </button>
          </div>
          <VehicleList />
        </div>

        {/* Book CTA */}
        <div
          className="lift-hover relative overflow-hidden rounded-3xl border border-white/10 animate-fade-up"
          style={{ animationDelay: '220ms' }}
        >
          <img
            src={BOOK_CTA_IMAGE.src}
            alt={BOOK_CTA_IMAGE.alt}
            className="absolute inset-0 h-full w-full object-cover animate-banner-pan"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/60 to-black/30" />
          <div className="relative flex items-center justify-between gap-4 p-8">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.35em] text-red-500">
                Quality Over Quantity
              </p>
              <h3 className="mt-2 text-2xl font-bold text-white">Ready to book?</h3>
            </div>
            <button
              onClick={() => setShowBooking(true)}
              className="press rounded-lg bg-red-600 px-5 py-2.5 text-sm font-medium text-white shadow-lg shadow-red-900/40 hover:bg-red-700"
            >
              Book a Detail
            </button>
          </div>
        </div>

        {/* Bookings */}
        <div className="space-y-4 animate-fade-up" style={{ animationDelay: '320ms' }}>
          <h2 className="text-xl font-bold text-white">Your Bookings</h2>
          <BookingsList />
        </div>

        {/* Gallery — fills the empty space below bookings with car photos. */}
        <div className="animate-fade-up" style={{ animationDelay: '420ms' }}>
          <GalleryStrip />
        </div>
      </div>

      {showAddVehicle && <AddVehicleForm onClose={() => setShowAddVehicle(false)} />}
      {showBooking && <BookingForm onClose={() => setShowBooking(false)} />}
    </main>
  );
}