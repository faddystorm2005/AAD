'use client';

import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabaseClient';

interface Stat {
  value: number;
  suffix?: string;
  label: string;
  hint?: string;
}

/**
 * Personalized stats strip for the dashboard. Same animated-counter pattern
 * as the homepage StatsStrip, but the numbers are pulled from the signed-in
 * user's own data: vehicles on file, total bookings, days since they joined.
 *
 * Builds a sense of "this is mine, I have history here" - cheap dopamine on
 * every dashboard visit.
 */
export default function DashboardStats() {
  const { user } = useAuth();
  const [stats, setStats] = useState<Stat[] | null>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    (async () => {
      const [vehiclesRes, bookingsRes] = await Promise.all([
        supabase
          .from('vehicles')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id),
        supabase
          .from('bookings')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id),
      ]);

      const vehiclesCount = vehiclesRes.count ?? 0;
      const bookingsCount = bookingsRes.count ?? 0;

      // Days since the account was created. Caps at 999 so the counter
      // animation doesn't take forever for long-time members.
      const createdAt = user.created_at ? new Date(user.created_at) : new Date();
      const days = Math.max(
        1,
        Math.floor((Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24))
      );

      if (cancelled) return;
      setStats([
        { value: vehiclesCount, label: 'Vehicles on File', hint: 'Your garage' },
        { value: bookingsCount, label: 'Details Booked', hint: 'Lifetime visits' },
        { value: Math.min(days, 999), label: 'Days a Member', hint: 'Thanks for sticking with us' },
      ]);
    })();

    return () => {
      cancelled = true;
    };
  }, [user]);

  if (!stats) {
    return (
      <div className="grid grid-cols-3 gap-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className="shimmer h-24 rounded-2xl" />
        ))}
      </div>
    );
  }

  return (
    <div
      className="grid grid-cols-3 gap-4"
      role="list"
      aria-label="Your account at a glance"
    >
      {stats.map((s) => (
        <StatTile key={s.label} stat={s} />
      ))}
    </div>
  );
}

function StatTile({ stat }: { stat: Stat }) {
  const ref = useRef<HTMLDivElement>(null);
  const [val, setVal] = useState(0);
  const startedRef = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const animate = () => {
      if (startedRef.current) return;
      startedRef.current = true;

      if (
        typeof window !== 'undefined' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches
      ) {
        setVal(stat.value);
        return;
      }

      const t0 = performance.now();
      const duration = 1100;
      const tick = (now: number) => {
        const progress = Math.min(1, (now - t0) / duration);
        const eased = 1 - Math.pow(1 - progress, 3);
        setVal(Math.round(stat.value * eased));
        if (progress < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    };

    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          animate();
          obs.disconnect();
        }
      },
      { threshold: 0.4 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [stat.value]);

  return (
    <div
      ref={ref}
      role="listitem"
      className="glass-card lift-hover rounded-2xl p-4 text-center sm:p-5"
      title={stat.hint}
    >
      <div className="text-2xl font-bold sm:text-3xl">
        <span className="text-gradient-hero">
          {val}
          {stat.suffix ?? ''}
        </span>
      </div>
      <div className="mt-1 text-[10px] uppercase tracking-[0.2em] text-gray-400 sm:text-xs">
        {stat.label}
      </div>
    </div>
  );
}
