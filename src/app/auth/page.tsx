'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import GalleryStrip from '@/components/GalleryStrip';
import { HERO_IMAGE } from '@/lib/siteImages';

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { signIn, signUp } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { error } = isLogin
        ? await signIn(email, password)
        : await signUp(email, password);

      if (error) {
        setError(error.message);
      } else {
        if (!isLogin) {
          setError('Check your email for the confirmation link!');
        } else {
          router.push('/dashboard');
        }
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
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
        <div className="text-center sr-only">
          <h1 className="text-3xl font-bold uppercase tracking-[0.18em] text-white">
            Austin Auto Detail
          </h1>
          <p className="mt-2 text-sm uppercase tracking-[0.35em] text-red-500">
            Quality Over Quantity
          </p>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-8 shadow-xl backdrop-blur-xl">
          <div className="mb-6 flex rounded-full bg-zinc-800 p-1">
            <button
              onClick={() => setIsLogin(true)}
              className={`flex-1 rounded-full py-2 text-sm font-medium transition-colors ${
                isLogin ? 'bg-red-600 text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => setIsLogin(false)}
              className={`flex-1 rounded-full py-2 text-sm font-medium transition-colors ${
                !isLogin ? 'bg-red-600 text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              Sign Up
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-300">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="mt-1 block w-full rounded-lg border border-gray-600 bg-gray-800 px-3 py-2 text-white placeholder-gray-400 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
                placeholder="your@email.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-300">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="mt-1 block w-full rounded-lg border border-gray-600 bg-gray-800 px-3 py-2 text-white placeholder-gray-400 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div className="rounded-lg bg-red-900/50 border border-red-700 p-3 text-sm text-red-200">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Please wait...' : isLogin ? 'Sign In' : 'Sign Up'}
            </button>
          </form>
        </div>
      </div>

      <div className="mx-auto w-full max-w-5xl px-6 pb-16">
        <GalleryStrip />
      </div>
    </main>
  );
}