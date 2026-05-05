'use client';

import { useEffect, useRef, useState } from 'react';

interface Stat {
  value: number;
  suffix?: string;
  prefix?: string;
  label: string;
}

const STATS: Stat[] = [
  { value: 90, label: 'Minutes Saved Per Detail' },
  { value: 3, suffix: '/day', label: 'Hand-Detailed, Not Rushed' },
  { value: 100, suffix: '%', label: 'Showroom-Ready, Guaranteed' },
];

export default function StatsStrip() {
  return (
    <ul
      className="stats-strip grid list-none grid-cols-3 gap-4 p-0 sm:gap-6"
      aria-label="Austin Auto Detail by the numbers"
    >
      {STATS.map((s) => (
        <StatTile key={s.label} stat={s} />
      ))}
    </ul>
  );
}

function StatTile({ stat }: { stat: Stat }) {
  const tileRef = useRef<HTMLLIElement>(null);
  const [active, setActive] = useState(false);

  // Observer attached to the outer tile div, not the inner number span.
  // The previous version observed the inner span, which sat inside a
  // text-gradient-hero parent (background-clip: text, color: transparent).
  // That combination caused inconsistent intersection rects, and the
  // counters stayed at 0 in production. Outer div has a normal block
  // box, threshold 0.1 fires as soon as any of it scrolls in.
  useEffect(() => {
    const el = tileRef.current;
    if (!el) return;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setActive(true);
      return;
    }

    // Safety fallback: if the observer never fires (rare browser bugs,
    // odd parent stacking), check on a short timer whether the tile is
    // already visible and trigger anyway. Belt and suspenders.
    let fallbackTimer: number | null = window.setTimeout(() => {
      const rect = el.getBoundingClientRect();
      const inView = rect.top < window.innerHeight && rect.bottom > 0;
      if (inView) setActive(true);
    }, 600);

    const obs = new IntersectionObserver(
      (entries) => {
        if (!entries[0].isIntersecting) return;
        setActive(true);
        if (fallbackTimer !== null) {
          clearTimeout(fallbackTimer);
          fallbackTimer = null;
        }
        obs.disconnect();
      },
      { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
    );

    obs.observe(el);
    return () => {
      obs.disconnect();
      if (fallbackTimer !== null) clearTimeout(fallbackTimer);
    };
  }, []);

  return (
    <li
      ref={tileRef}
      className="text-center animate-fade-up"
    >
      <div className="text-2xl font-bold sm:text-4xl">
        <span className="text-gradient-hero">
          {stat.prefix ?? ''}
          <CountUp target={stat.value} active={active} />
          {stat.suffix ?? ''}
        </span>
      </div>
      <div className="mt-3 text-xs uppercase tracking-[0.18em] text-gray-200 sm:text-sm sm:tracking-[0.2em]">
        {stat.label}
      </div>
    </li>
  );
}

// Animates from 0 to target once `active` flips true. Parent tile owns
// the IntersectionObserver; this component is purely the count animation.
function CountUp({ target, active }: { target: number; active: boolean }) {
  const [val, setVal] = useState(0);
  const startedRef = useRef(false);

  useEffect(() => {
    if (!active || startedRef.current) return;
    startedRef.current = true;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setVal(target);
      return;
    }

    const t0 = performance.now();
    const duration = 1300;
    let raf = 0;
    const tick = (now: number) => {
      const progress = Math.min(1, (now - t0) / duration);
      // ease-out cubic for a confident landing on the final number
      const eased = 1 - Math.pow(1 - progress, 3);
      setVal(Math.round(target * eased));
      if (progress < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(raf);
  }, [active, target]);

  return <>{val}</>;
}
