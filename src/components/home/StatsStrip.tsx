'use client';

import { ReactNode, useEffect, useRef, useState } from 'react';

type NumericStat = {
  kind: 'number';
  value: number;
  suffix?: string;
  prefix?: string;
  label: string;
};
type IconStat = {
  kind: 'icon';
  icon: ReactNode;
  label: string;
};
type Stat = NumericStat | IconStat;

const STATS: Stat[] = [
  { kind: 'number', value: 24, suffix: 'hr', label: 'Booking Confirmation' },
  {
    kind: 'icon',
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="currentColor"
        aria-hidden="true"
        className="mx-auto h-9 w-9 sm:h-12 sm:w-12"
      >
        <path d="M10 2h4v6h6v4h-6v10h-4V12H4V8h6z" />
      </svg>
    ),
    label: 'Faith-Driven Service',
  },
  { kind: 'number', value: 100, suffix: '%', label: 'Showroom-Ready, Guaranteed' },
];

export default function StatsStrip() {
  return (
    <ul
      className="stats-strip grid list-none grid-cols-3 gap-4 p-0 sm:gap-6"
      aria-label="Signature Mobile Detailing by the numbers"
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

  useEffect(() => {
    const el = tileRef.current;
    if (!el) return;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setActive(true);
      return;
    }

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
    <li ref={tileRef} className="text-center animate-fade-up">
      <div className="text-2xl font-bold sm:text-4xl">
        <span className="text-gradient-hero">
          {stat.kind === 'number' ? (
            <>
              {stat.prefix ?? ''}
              <CountUp target={stat.value} active={active} />
              {stat.suffix ?? ''}
            </>
          ) : (
            stat.icon
          )}
        </span>
      </div>
      <div className="mt-3 text-xs uppercase tracking-[0.18em] text-gray-200 sm:text-sm sm:tracking-[0.2em]">
        {stat.label}
      </div>
    </li>
  );
}

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
      const eased = 1 - Math.pow(1 - progress, 3);
      setVal(Math.round(target * eased));
      if (progress < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(raf);
  }, [active, target]);

  return <>{val}</>;
}
