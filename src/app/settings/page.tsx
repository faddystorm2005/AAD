'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import VehicleList from '@/components/VehicleList';
import AddVehicleForm from '@/components/AddVehicleForm';
import BookingWeather from '@/components/BookingWeather';

interface Profile {
  id: string;
  full_name: string | null;
  phone: string | null;
  email: string | null;
}

interface PastBooking {
  id: string;
  service: string;
  scheduled_at: string;
  total: number;
  status: string;
  completed_at: string | null;
  decline_reason: string | null;
}

export default function SettingsPage() {
  const { user, loading: authLoading, signOut } = useAuth();
  const router = useRouter();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMessage, setProfileMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [showAddVehicle, setShowAddVehicle] = useState(false);

  const [history, setHistory] = useState<PastBooking[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) router.replace('/auth');
  }, [authLoading, user, router]);

  // Auto-clear profile flash messages.
  useEffect(() => {
    if (!profileMessage) return;
    const t = setTimeout(() => setProfileMessage(null), 2500);
    return () => clearTimeout(t);
  }, [profileMessage]);

  // Load profile.
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name, phone, email')
        .eq('id', user.id)
        .maybeSingle();
      if (cancelled) return;
      const p: Profile = {
        id: user.id,
        full_name: data?.full_name ?? null,
        phone: data?.phone ?? null,
        email: data?.email ?? user.email ?? null,
      };
      setProfile(p);
      setFullName(p.full_name ?? '');
      setPhone(p.phone ?? '');
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  // Load past (completed or declined) bookings.
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    setLoadingHistory(true);
    (async () => {
      const { data } = await supabase
        .from('bookings')
        .select('id, service, scheduled_at, total, status, completed_at, decline_reason')
        .eq('user_id', user.id)
        .in('status', ['completed', 'declined'])
        .order('scheduled_at', { ascending: false })
        .limit(50);
      if (cancelled) return;
      setHistory((data as PastBooking[]) ?? []);
      setLoadingHistory(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const handleSaveProfile = async () => {
    if (!user) return;
    setSavingProfile(true);
    setProfileMessage(null);
    try {
      const trimmedName = fullName.trim();
      const trimmedPhone = phone.trim();
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: trimmedName || null,
          phone: trimmedPhone || null,
        })
        .eq('id', user.id);

      if (error) throw error;
      setProfile((prev) =>
        prev
          ? { ...prev, full_name: trimmedName || null, phone: trimmedPhone || null }
          : prev
      );
      setProfileMessage({ type: 'success', text: 'Profile updated.' });
    } catch (err: any) {
      setProfileMessage({ type: 'error', text: err?.message || 'Save failed.' });
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    router.push('/auth');
  };

  if (authLoading || !user) {
    return (
      <main className="min-h-screen bg-black px-6 py-16 text-white">
        <div className="flex items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-red-600 border-t-transparent" />
        </div>
      </main>
    );
  }

  const profileDirty =
    (fullName.trim() || null) !== (profile?.full_name ?? null) ||
    (phone.trim() || null) !== (profile?.phone ?? null);

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="border-b border-white/10 bg-black/60 px-6 py-6 backdrop-blur">
        <div className="mx-auto flex w-full max-w-3xl flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold uppercase tracking-[0.18em]">Settings</h1>
            <p className="mt-1 text-sm text-gray-200">{user.email}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/"
              className="press rounded-lg border border-white/30 bg-black/40 px-4 py-2.5 text-base font-semibold text-white hover:bg-black/60"
              title="View public homepage"
            >
              ← Home
            </Link>
            <Link
              href="/dashboard"
              className="press rounded-lg border border-white/30 bg-black/40 px-4 py-2.5 text-base font-semibold text-white hover:bg-black/60"
            >
              Dashboard
            </Link>
          </div>
        </div>
      </div>

      <div className="mx-auto flex w-full max-w-3xl flex-col gap-10 px-6 py-10">

        {/* Profile */}
        <section className="reveal-on-scroll animate-fade-up space-y-4">
          <div>
            <h2 className="h-accent text-2xl font-bold">Your profile</h2>
            <p className="mt-2 text-base text-gray-200">
              Your contact details. We use these to reach you about bookings.
            </p>
          </div>

          <div className="glass-card rounded-2xl p-6">
            <div className="space-y-5">
              <div>
                <label htmlFor="settings-name" className="block text-base font-semibold text-white mb-2">
                  Full name
                </label>
                <input
                  id="settings-name"
                  type="text"
                  autoComplete="name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Your name"
                  className="w-full rounded-xl border-2 border-gray-700 bg-gray-900 px-4 py-3 text-base text-white placeholder-gray-500 focus:border-red-500 focus:outline-none"
                />
              </div>

              <div>
                <label htmlFor="settings-phone" className="block text-base font-semibold text-white mb-2">
                  Phone
                </label>
                <input
                  id="settings-phone"
                  type="tel"
                  autoComplete="tel"
                  inputMode="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="(512) 555-0123"
                  className="w-full rounded-xl border-2 border-gray-700 bg-gray-900 px-4 py-3 text-base text-white placeholder-gray-500 focus:border-red-500 focus:outline-none"
                />
              </div>

              <div>
                <label htmlFor="settings-email" className="block text-base font-semibold text-white mb-2">
                  Email
                </label>
                <input
                  id="settings-email"
                  type="email"
                  value={profile?.email ?? user.email ?? ''}
                  readOnly
                  className="w-full cursor-not-allowed rounded-xl border-2 border-gray-800 bg-gray-950 px-4 py-3 text-base text-gray-300"
                />
                <p className="mt-2 text-sm text-gray-300">
                  Email is tied to your sign-in. Reach out if you need to change it.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleSaveProfile}
                  disabled={!profileDirty || savingProfile}
                  className="btn-primary press rounded-xl px-5 py-3 text-base font-semibold disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {savingProfile ? 'Saving…' : 'Save changes'}
                </button>
                {profileMessage && (
                  <span
                    role={profileMessage.type === 'error' ? 'alert' : 'status'}
                    className={`text-base font-semibold ${
                      profileMessage.type === 'success' ? 'text-green-300' : 'text-red-300'
                    }`}
                  >
                    {profileMessage.text}
                  </span>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Vehicles */}
        <section className="reveal-on-scroll animate-fade-up space-y-4" style={{ animationDelay: '80ms' }}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="h-accent text-2xl font-bold">Your cars</h2>
              <p className="mt-2 text-base text-gray-200">
                Add or remove the cars you want us to detail.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowAddVehicle(true)}
              className="btn-primary press rounded-xl px-5 py-3 text-base font-semibold"
            >
              + Add a car
            </button>
          </div>
          <VehicleList />
        </section>

        {/* Booking history */}
        <section className="reveal-on-scroll animate-fade-up space-y-4" style={{ animationDelay: '160ms' }}>
          <div>
            <h2 className="h-accent text-2xl font-bold">Past bookings</h2>
            <p className="mt-2 text-base text-gray-200">
              Bookings that already wrapped up or were declined.
            </p>
          </div>

          {loadingHistory ? (
            <div className="h-24 animate-pulse rounded-xl bg-gray-800/60" />
          ) : history.length === 0 ? (
            <p className="text-base text-gray-300">
              Nothing here yet. Your past bookings will appear once we&apos;ve worked on them.
            </p>
          ) : (
            <ul className="space-y-3">
              {history.map((b) => (
                <li
                  key={b.id}
                  className="rounded-xl border border-white/10 bg-gray-900/40 p-5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-lg font-semibold text-white">{b.service}</p>
                      <p className="mt-1 text-base text-gray-200">
                        {new Date(b.scheduled_at).toLocaleString()}
                      </p>
                      {b.status === 'declined' && b.decline_reason && (
                        <p className="mt-2 text-sm text-red-200">Reason: {b.decline_reason}</p>
                      )}
                      <div className="mt-2">
                        <BookingWeather date={b.scheduled_at} compact />
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span
                        className={`rounded-full border px-3 py-1 text-sm font-semibold ${
                          b.status === 'completed'
                            ? 'border-green-700 bg-green-900/30 text-green-200'
                            : 'border-red-700 bg-red-900/30 text-red-200'
                        }`}
                      >
                        {b.status === 'completed' ? 'Completed' : 'Declined'}
                      </span>
                      <span className="text-base font-semibold text-gray-200">
                        ${Number(b.total).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Account actions */}
        <section className="reveal-on-scroll animate-fade-up space-y-4" style={{ animationDelay: '240ms' }}>
          <div>
            <h2 className="h-accent text-2xl font-bold">Account</h2>
          </div>
          <div className="glass-card rounded-2xl p-6">
            <button
              type="button"
              onClick={handleSignOut}
              className="press rounded-xl border-2 border-white/30 bg-black/40 px-5 py-3 text-base font-semibold text-white hover:bg-black/60"
            >
              Sign out
            </button>
          </div>
        </section>
      </div>

      {showAddVehicle && <AddVehicleForm onClose={() => setShowAddVehicle(false)} />}
    </main>
  );
}
