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
  const [code, setCode] = useState('');
  const [loadingCode, setLoadingCode] = useState(false);

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
          queryParams: { prompt: 'select_account' },
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

  // Cross-device sign-in: user opens email on their phone and types the
  // numeric code into this device. Supabase's verifyOtp exchanges the code
  // for a session attached to THIS browser, so they end up signed in on
  // the computer (not on the phone). The code length depends on the
  // Supabase project's "Email OTP length" setting (6-10 digits) - we
  // accept any length in that range.
  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = code.replace(/\D/g, '').slice(0, 10);
    if (cleaned.length < 6) {
      setError('Enter the full numeric code from your email.');
      return;
    }
    setLoadingCode(true);
    setError('');
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email: email.trim(),
        token: cleaned,
        type: 'email',
      });
      if (error || !data?.session) {
        setError(
          error?.message ||
            "That code didn't work. If you already clicked the link in the email, the code is used up - request a new one below."
        );
        return;
      }

      // Mirror the callback's first-time check: count this user's vehicles
      // and route accordingly. Reads are safe via RLS (user reads their own).
      const userId = data.session.user.id;
      let firstTime = false;
      try {
        const { count } = await supabase
          .from('vehicles')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId);
        firstTime = (count ?? 0) === 0;
      } catch {
        // Ignore - default to non-first-time so we still send them in.
      }
      router.replace(
        firstTime ? '/dashboard?signedIn=1&firstTime=1' : '/dashboard?signedIn=1'
      );
    } catch {
      setError('An unexpected error occurred');
    } finally {
      setLoadingCode(false);
    }
  };

  return (
    <main className="min-h-screen bg-black text-white">
      {/* Hero */}
      <div className="relative h-[45vh] min-h-[280px] w-full overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={HERO_IMAGE.src}
          alt={HERO_IMAGE.alt}
          width={1920}
          height={1080}
          fetchPriority="high"
          loading="eager"
          decoding="async"
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
            <h2 className="text-xl font-semibold text-white sm:text-2xl">
              Sign in to Austin Auto Detail
            </h2>
            <p className="mt-2 text-sm text-gray-300">
              The fastest way is your Google account. Email also works.
            </p>
          </div>

          {magicSent ? (
            <div className="space-y-5">
              <div className="rounded-xl border-2 border-green-700 bg-green-900/40 p-4 text-base text-green-100">
                <p className="font-bold text-lg">Check your email</p>
                <p className="mt-2">
                  We sent a sign-in email to <strong>{email}</strong>.
                </p>
              </div>

              <div className="space-y-3">
                <div className="rounded-xl border border-white/10 bg-black/30 p-4">
                  <p className="text-base font-semibold text-white">
                    📱 On the same device as the email?
                  </p>
                  <p className="mt-1 text-sm text-gray-200">
                    Just tap the link in the email. You&apos;ll come right back here, signed in.
                  </p>
                </div>

                <div className="rounded-xl border border-white/10 bg-black/30 p-4">
                  <p className="text-base font-semibold text-white">
                    💻 On a different device?
                  </p>
                  <p className="mt-1 text-sm text-gray-200">
                    The email also has a numeric code. Type it here to sign in on this device. <strong>Don&apos;t click the link first</strong>, that uses up the code.
                  </p>
                  <form onSubmit={handleVerifyCode} className="mt-3 space-y-3">
                    <input
                      type="text"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      pattern="[0-9]*"
                      maxLength={10}
                      placeholder="Code from email"
                      value={code}
                      onChange={(e) => {
                        setCode(e.target.value.replace(/\D/g, '').slice(0, 10));
                        if (error) setError('');
                      }}
                      className="w-full rounded-xl border-2 border-gray-700 bg-gray-900 px-4 py-3 text-center text-2xl font-mono font-bold tracking-[0.3em] text-white placeholder-gray-600 focus:border-red-500 focus:outline-none"
                    />
                    <button
                      type="submit"
                      disabled={loadingCode || code.length < 6}
                      className="btn-primary press w-full rounded-xl px-4 py-3 text-base font-semibold disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {loadingCode ? 'Signing in…' : 'Sign in with code'}
                    </button>
                  </form>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setMagicSent(false);
                  setEmail('');
                  setCode('');
                  setError('');
                }}
                className="press w-full rounded-lg border border-white/20 bg-black/30 px-4 py-3 text-base font-semibold text-gray-200 hover:bg-black/50"
              >
                Use a different email
              </button>
            </div>
          ) : (
            <>
              {/* PRIMARY: Google. Bigger, brighter, ringed, with a small
                  'Recommended' pill above to draw the eye. */}
              <div className="space-y-2">
                <p className="text-center text-[11px] font-semibold uppercase tracking-[0.3em] text-red-400">
                  Recommended
                </p>
                <button
                  type="button"
                  onClick={handleGoogle}
                  disabled={loadingGoogle || loadingMagic}
                  className="press flex w-full items-center justify-center gap-3 rounded-xl bg-white px-5 py-4 text-base font-semibold text-gray-900 shadow-lg shadow-white/10 ring-1 ring-white/20 transition hover:bg-gray-50 hover:shadow-white/20 disabled:cursor-not-allowed disabled:opacity-50 sm:text-lg"
                >
                  <GoogleIcon />
                  {loadingGoogle ? 'Redirecting...' : 'Continue with Google'}
                </button>
              </div>

              {/* SECONDARY: subtler caption divider, no horizontal lines. */}
              <p className="my-7 text-center text-xs uppercase tracking-[0.25em] text-gray-300">
                Or use your email
              </p>

              {/* Inline error sits above the form so users see validation
                  without scrolling on mobile. */}
              {error && (
                <div className="mb-4 rounded-lg border border-red-700 bg-red-900/50 p-3 text-base text-red-200">
                  {error}
                </div>
              )}

              <form onSubmit={handleMagicLink} className="space-y-3">
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  aria-label="Email address"
                  className="block w-full rounded-lg border border-gray-700 bg-gray-900/60 px-4 py-3 text-base text-white placeholder-gray-500 focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500"
                  placeholder="your@email.com"
                />

                <button
                  type="submit"
                  disabled={loadingGoogle || loadingMagic || !email.trim()}
                  className="press w-full rounded-lg border border-gray-600 bg-transparent px-4 py-3 text-base font-semibold text-gray-200 hover:border-gray-400 hover:bg-white/5 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loadingMagic ? 'Sending link...' : 'Send me a sign-in code'}
                </button>
              </form>

              <p className="mt-4 text-center text-sm text-gray-300">
                We&apos;ll email a link + code. First time? Account created automatically.
              </p>
            </>
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
