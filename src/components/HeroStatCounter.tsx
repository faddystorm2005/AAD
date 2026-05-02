'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Counts up from 0 to 4 when scrolled into view, then shows "4+ hrs".
 * Mirrors the DashboardStats counter pattern.
 */
export default function HeroStatCounter() {
  const ref = useRef<HTMLSpanElement>(null);
  const [val, setVal] = useState(0);
  const started = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setVal(4);
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
          const eased = 1 - Math.pow(1 - progress, 3);
          setVal(Math.round(4 * eased));
          if (progress < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      },
      { threshold: 0.5 }
    );

    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <span ref={ref} className="text-gradient-hero">
      {val}+ hrs
    </span>
  );
}
