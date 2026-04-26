'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (user) {
        router.push('/dashboard');
      } else {
        router.push('/auth');
      }
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <main className="min-h-screen bg-black px-6 py-16 text-white">
        <div className="flex min-h-screen items-center justify-center">
          <div className="text-center animate-fade-in">
            <p className="font-bold uppercase tracking-[0.4em] text-red-600 animate-pulse-soft">
              AAD
            </p>
            <div className="mx-auto mt-5 h-8 w-8 animate-spin rounded-full border-2 border-red-600 border-t-transparent" />
            <p className="mt-4 text-sm text-gray-400">Loading…</p>
          </div>
        </div>
      </main>
    );
  }

  return null;
}
