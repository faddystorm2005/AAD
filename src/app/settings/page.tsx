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
      <div className="border-b border-white/10 bg-black/60 px-6 py-5 backdrop-blur">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between">
          <div>
            <h1 className="text-xl font-bold uppercase tracking-[0.18em]">Settings</h1>
            <p className="text-xs text-gray-400">{user.email}</p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="press rounded-lg border border-white/30 bg-black/40 px-3 py-1.5 text-sm text-white hover:bg-black/60"
              title="View public homepage"
            >
              ← Home
            </Link>
            <Link
              href="/dashboard"
              className="press rounded-lg border border-white/30 bg-black/40 px-3 py-1.5 text-sm text-white hover:bg-black/60"
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
            <h2 className="h-accent text-lg font-bold">Profile</h2>
            <p className="text-sm text-gray-400">Your contact details. We use these to reach you about bookings.</p>
          </div>

          <div className="glass-card rounded-xl p-5">
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Full name
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Your name"
                  className="mt-1 w-full rounded-lg border border-gray-600 bg-gray-800 px-3 py-2 text-white focus:border-red-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Phone
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="(512) 555-0123"
                  className="mt-1 w-full rounded-lg border border-gray-600 bg-gray-800 px-3 py-2 text-white focus:border-red-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Email
                </label>
                <input
                  type="email"
                  value={profile?.email ?? user.email ?? ''}
                  readOnly
                  className="mt-1 w-full cursor-not-allowed rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-gray-400"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Email is tied to your sign-in. Contact support to change it.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleSaveProfile}
                  disabled={!profileDirty || savingProfile}
                  className="press rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {savingProfile ? 'Saving…' : 'Save changes'}
                </button>
                {profileMessage && (
                  <span
                    className={`text-sm ${
                      profileMessage.type === 'success' ? 'text-green-400' : 'text-red-300'
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
          <div className="flex items-center justify-between">
            <div>
              <h2 className="h-accent text-lg font-bold">My Vehicles</h2>
              <p className="text-sm text-gray-400">Add or remove the cars we should know about.</p>
            </div>
            <button
              type="button"
              onClick={() => setShowAddVehicle(true)}
              className="btn-primary press rounded-lg px-3 py-1.5 text-sm font-medium"
            >
              + Add
            </button>
          </div>
          <VehicleList />
        </section>

        {/* Booking history */}
        <section className="reveal-on-scroll animate-fade-up space-y-4" style={{ animationDelay: '160ms' }}>
          <div>
            <h2 className="h-accent text-lg font-bold">Booking history</h2>
            <p className="text-sm text-gray-400">Completed and declined bookings.</p>
          </div>

          {loadingHistory ? (
            <div className="h-20 animate-pulse rounded-lg bg-gray-800/60" />
          ) : history.length === 0 ? (
            <p className="text-sm text-gray-500">Nothing here yet - your past bookings will show up after they wrap up.</p>
          ) : (
            <ul className="space-y-2">
              {history.map((b) => (
                <li
                  key={b.id}
                  className="rounded-lg border border-white/10 bg-gray-900/40 p-3 text-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <p className="font-medium text-white">{b.service}</p>
                      <p className="text-xs text-gray-400">
                        {new Date(b.scheduled_at).toLocaleString()}
                      </p>
                      {b.status === 'declined' && b.decline_reason && (
                        <p className="mt-1 text-xs text-red-300">Reason: {b.decline_reason}</p>
                      )}
                      <div className="mt-1">
                        <BookingWeather date={b.scheduled_at} compact />
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1 text-xs">
                      <span
                        className={`rounded-full border px-2 py-0.5 font-medium ${
                          b.status === 'completed'
                            ? 'border-green-700 bg-green-900/30 text-green-200'
                            : 'border-red-700 bg-red-900/30 text-red-200'
                        }`}
                      >
                        {b.status === 'completed' ? 'Completed' : 'Declined'}
                      </span>
                      <span className="text-gray-400">${Number(b.total).toFixed(2)}</span>
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
            <h2 className="h-accent text-lg font-bold">Account</h2>
          </div>
          <div className="glass-card rounded-xl p-5">
            <button
              type="button"
              onClick={handleSignOut}
              className="press rounded-lg border border-white/30 bg-black/40 px-4 py-2 text-sm text-white hover:bg-black/60"
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
