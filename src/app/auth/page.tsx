'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import GalleryStrip from '@/components/GalleryStrip';
import { HERO_IMAGE } from '@/lib/siteImages';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Next.js 16 requires any component reading useSearchParams to be wrapped
 * in a <Suspense> boundary so the prerender doesn't bail.
 */
export default function Auth() {
  return (
    <Suspense fallback={<AuthFallback />}>
      <AuthInner />
    </Suspense>
  );
}

function AuthFallback() {
  return (
    <main className="min-h-screen bg-black px-6 py-16 text-white">
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-red-600 border-t-transparent" />
      </div>
    </main>
  );
}

function AuthInner() {
  const [email, setEmail] = useState('');
  const [loadingGoogle, setLoadingGoogle] = useState(false);
  const [loadingMagic, setLoadingMagic] = useState(false);
  const [error, setError] = useState('');
  const [magicSent, setMagicSent] = useState(false);

  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  // If they're already signed in, bounce them to the dashboard. This catches
  // every "Book Now" / "Sign In" link in the site - no need to make every
  // link auth-aware. Wait for authLoading to finish so we don't flash the
  // form before AuthProvider has hydrated the session from localStorage.
  useEffect(() => {
    if (!authLoading && user) {
      router.replace('/dashboard');
    }
  }, [user, authLoading, router]);

  // Surface ?error=... messages forwarded from /auth/callback (e.g., when
  // a confirmation link has expired or already been used).
  useEffect(() => {
    const incoming = searchParams.get('error');
    if (incoming) setError(incoming);
  }, [searchParams]);

  // Don't render the form for signed-in users mid-redirect - just the loader.
  if (authLoading || user) return <AuthFallback />;

  const handleGoogle = async () => {
    setLoadingGoogle(true);
    setError('');
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) setError(error.message);
    } catch {
      setError('An unexpected error occurred');
    } finally {
      setLoadingGoogle(false);
    }
  };

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoadingMagic(true);
    setError('');
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          shouldCreateUser: true,
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) {
        setError(error.message);
      } else {
        setMagicSent(true);
      }
    } catch {
      setError('An unexpected error occurred');
    } finally {
      setLoadingMagic(false);
    }
  };

  return (
    <main className="min-h-screen bg-black text-white">
      {/* Hero */}
      <div className="relative h-[45vh] min-h-[280px] w-full overflow-hidden">
        <img
          src={HERO_IMAGE.src}
          alt={HERO_IMAGE.alt}
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/30 to-black" />
        <div className="relative flex h-full flex-col items-center justify-center px-6 text-center">
          <h1 className="text-4xl font-bold uppercase tracking-[0.18em] text-white sm:text-5xl">
            Austin Auto Detail
          </h1>
          <p className="mt-3 text-sm uppercase tracking-[0.35em] text-red-500">
            Quality Over Quantity
          </p>
        </div>
      </div>

      <div className="mx-auto flex w-full max-w-md flex-col gap-8 px-6 py-12">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-8 shadow-xl backdrop-blur-xl">
          <div className="mb-6 text-center">
            <h2 className="text-xl font-semibold text-white">
              Sign in to Austin Auto Detail
            </h2>
            <p className="mt-2 text-sm text-gray-400">
              No password needed. Pick whichever is easier.
            </p>
          </div>

          {magicSent ? (
            <div className="space-y-4 text-center">
              <div className="rounded-lg border border-green-700 bg-green-900/40 p-4 text-sm text-green-200">
                <p className="font-semibold">Check your email</p>
                <p className="mt-1">
                  We sent a sign-in link to <strong>{email}</strong>. Click it
                  to come back here.
                </p>
              </div>
              <button
                onClick={() => {
                  setMagicSent(false);
                  setEmail('');
                  setError('');
                }}
                className="text-sm text-gray-400 underline hover:text-white"
              >
                Use a different email
              </button>
            </div>
          ) : (
            <>
              <button
                type="button"
                onClick={handleGoogle}
                disabled={loadingGoogle || loadingMagic}
                className="press flex w-full items-center justify-center gap-3 rounded-lg border border-white/20 bg-white px-4 py-3 text-sm font-semibold text-gray-900 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <GoogleIcon />
                {loadingGoogle ? 'Redirecting...' : 'Continue with Google'}
              </button>

              <div className="my-6 flex items-center gap-3 text-xs uppercase tracking-widest text-gray-500">
                <div className="h-px flex-1 bg-white/10" />
                or
                <div className="h-px flex-1 bg-white/10" />
              </div>

              <form onSubmit={handleMagicLink} className="space-y-4">
                <div>
                  <label
                    htmlFor="email"
                    className="block text-sm font-medium text-gray-300"
                  >
                    Email
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                    className="mt-1 block w-full rounded-lg border border-gray-600 bg-gray-800 px-3 py-2 text-white placeholder-gray-400 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
                    placeholder="your@email.com"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loadingGoogle || loadingMagic || !email.trim()}
                  className="btn-primary press w-full rounded-lg px-4 py-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loadingMagic ? 'Sending link...' : 'Continue with Email'}
                </button>
              </form>

              <p className="mt-4 text-center text-xs text-gray-500">
                We&apos;ll email you a one-tap sign-in link. First time? An
                account is created automatically.
              </p>
            </>
          )}

          {error && (
            <div className="mt-4 rounded-lg border border-red-700 bg-red-900/50 p-3 text-sm text-red-200">
              {error}
            </div>
          )}
        </div>
      </div>

      <div className="mx-auto w-full max-w-5xl px-6 pb-16">
        <GalleryStrip />
      </div>
    </main>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.81 5.96-2.18l-2.92-2.26c-.81.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18z"
      />
      <path
        fill="#FBBC05"
        d="M3.97 10.72A5.4 5.4 0 0 1 3.68 9c0-.6.1-1.18.29-1.72V4.95H.96A9 9 0 0 0 0 9c0 1.45.35 2.83.96 4.05l3.01-2.33z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.5.45 3.44 1.34l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58z"
      />
    </svg>
  );
}
