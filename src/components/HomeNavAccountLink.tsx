'use client';

import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Auth-aware nav button rendered in the homepage header. Always visible.
 *   Signed in:  "Dashboard" button to /dashboard
 *   Signed out: "Sign In"  button to /auth
 *   Loading:    nothing rendered (avoids label flicker on first paint)
 */
export default function HomeNavAccountLink() {
  const { user, loading } = useAuth();
  if (loading) return null;

  const baseClasses =
    'press shrink-0 rounded-lg border border-white/30 bg-black/40 px-3 py-2 text-sm font-semibold text-white backdrop-blur hover:bg-white/10 sm:px-4 sm:py-2.5 sm:text-base';

  if (user) {
    return (
      <Link href="/dashboard" className={baseClasses} title="Back to your account">
        Dashboard
      </Link>
    );
  }

  return (
    <Link href="/auth" className={baseClasses} title="Sign in to your account">
      Sign In
    </Link>
  );
}
