'use client';

import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Small client component for the public homepage nav. If the visitor is
 * already signed in, it renders a "Dashboard" link straight to /dashboard
 * so they can get back to their account without going through /auth again.
 * Otherwise it renders nothing — the nav already has a "Book Now" CTA
 * which handles new visitors.
 */
export default function HomeNavAccountLink() {
  const { user, loading } = useAuth();
  if (loading || !user) return null;
  return (
    <Link
      href="/dashboard"
      className="hover:text-white"
      title="Back to your account"
    >
      My Dashboard
    </Link>
  );
}
