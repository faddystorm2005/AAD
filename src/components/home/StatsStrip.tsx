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
  { value: 3, suffix: '/day', label: 'Cars Max - No Rush Jobs' },
  { value: 100, suffix: '%', label: 'Showroom-Ready, Guaranteed' },
];

export default function StatsStrip() {
  return (
    <div
      className="grid grid-cols-3 gap-4 sm:gap-6"
      role="list"
      aria-label="Austin Auto Detail by the numbers"
    >
      {STATS.map((s, i) => (
        <StatTile key={s.label} stat={s} index={i} />
      ))}
    </div>
  );
}

function StatTile({ stat, index }: { stat: Stat; index: number }) {
  return (
    <div
      role="listitem"
      className="text-center animate-fade-up"
      style={{ animationDelay: `${index * 80}ms` }}
    >
      <div className="text-2xl font-bold sm:text-4xl">
        <span className="text-gradient-hero">
          {stat.prefix ?? ''}
          <CountUp target={stat.value} />
          {stat.suffix ?? ''}
        </span>
      </div>
      <div className="mt-3 text-[10px] uppercase tracking-[0.18em] text-gray-200 sm:text-sm sm:tracking-[0.2em]">
        {stat.label}
      </div>
    </div>
  );
}

// Count-up that respects prefers-reduced-motion and only animates when the
// strip enters the viewport. SSR renders 0 (matches the data-target=0 pattern
// from the migration preview); the final number lands within ~1.3s on screens
// that scroll the strip into view, so crawlers and reduced-motion users see
// the real number immediately.
function CountUp({ target }: { target: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [val, setVal] = useState(0);
  const started = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setVal(target);
      return;
    }

    const obs = new IntersectionObserver(
      (entries) => {
        if (!entries[0].isIntersecting || started.current) return;
        started.current = true;
        obs.disconnect();

        const t0 = performance.now();
        const duration = 1300;
        const tick = (now: number) => {
          const progress = Math.min(1, (now - t0) / duration);
          // ease-out cubic for a confident landing on the final number
          const eased = 1 - Math.pow(1 - progress, 3);
          setVal(Math.round(target * eased));
          if (progress < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      },
      { threshold: 0.5 }
    );

    obs.observe(el);
    return () => obs.disconnect();
  }, [target]);

  return <span ref={ref}>{val}</span>;
}
