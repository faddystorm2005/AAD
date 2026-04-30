'use client';

import { useEffect, useRef, useState } from 'react';

interface Stat {
  value: number;
  suffix?: string;
  prefix?: string;
  label: string;
}

// Stats mix the three things customers care about: convenience, price/value,
// and quality. The labels lean into trust + value over bland activity counts.
//   #1 Trust + social proof (500+ trusted customers)
//   #2 Convenience + quality alignment (3 cars/day max - "Quality Over Quantity")
//   #3 Quality + trust (5-star average)
//   #4 Quality + guarantee (100% showroom-ready, guaranteed)
const STATS: Stat[] = [
  { value: 500, suffix: '+', label: 'Trusted Austin Customers' },
  { value: 3, suffix: '/day', label: 'Cars Max - No Rush Jobs' },
  { value: 5, suffix: '★', label: 'Average Customer Rating' },
  { value: 100, suffix: '%', label: 'Showroom-Ready, Guaranteed' },
];

/**
 * Animated stat counters. Numbers count up smoothly the first time the strip
 * scrolls into view - cheap dopamine hit + immediate trust signal.
 */
export default function StatsStrip() {
  const ref = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      setActive(true); // skip animation, show final numbers
      return;
    }

    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setActive(true);
          obs.disconnect();
        }
      },
      { threshold: 0.4 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className="grid grid-cols-2 gap-6 sm:grid-cols-4"
      role="list"
      aria-label="Austin Auto Detail by the numbers"
    >
      {STATS.map((s) => (
        <StatTile key={s.label} stat={s} active={active} />
      ))}
    </div>
  );
}

function StatTile({ stat, active }: { stat: Stat; active: boolean }) {
  const [val, setVal] = useState(0);
  const startedRef = useRef(false);

  useEffect(() => {
    if (!active || startedRef.current) return;
    startedRef.current = true;

    // Skip animation for reduced-motion - jump to final.
    if (
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      setVal(stat.value);
      return;
    }

    const t0 = performance.now();
    const duration = 1200;
    const tick = (now: number) => {
      const progress = Math.min(1, (now - t0) / duration);
      // Ease-out-cubic for a confident slow-down at the end.
      const eased = 1 - Math.pow(1 - progress, 3);
      setVal(Math.round(stat.value * eased));
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [active, stat.value]);

  return (
    <div role="listitem" className="text-center">
      <div className="text-3xl font-bold sm:text-4xl">
        <span className="text-gradient-hero">
          {stat.prefix ?? ''}
          {val}
          {stat.suffix ?? ''}
        </span>
      </div>
      <div className="mt-3 text-xs uppercase tracking-[0.2em] text-gray-200 sm:text-sm">
        {stat.label}
      </div>
    </div>
  );
}
