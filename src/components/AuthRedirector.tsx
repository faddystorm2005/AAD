'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

/**
 * Side-effect-only component that redirects logged-in visitors to /dashboard.
 * Renders nothing — the homepage's marketing content stays visible until
 * the redirect fires, so crawlers always see real content.
 */
export default function AuthRedirector() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.replace('/dashboard');
    }
  }, [user, loading, router]);

  return null;
}
