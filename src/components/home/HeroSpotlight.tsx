'use client';

import { useEffect, useRef } from 'react';

/**
 * Mouse-following soft red glow for the hero. Subtle, premium - the kind of
 * effect you'd see on a luxury car website. Pure CSS transform on a single
 * div, no per-frame React state, no rerender churn.
 *
 * Disabled when prefers-reduced-motion is set.
 */
export default function HeroSpotlight() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      return;
    }

    const onMove = (e: MouseEvent) => {
      const parent = el.parentElement;
      if (!parent) return;
      const rect = parent.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      el.style.setProperty('--mx', `${x}px`);
      el.style.setProperty('--my', `${y}px`);
    };

    const parent = el.parentElement;
    parent?.addEventListener('mousemove', onMove);
    return () => parent?.removeEventListener('mousemove', onMove);
  }, []);

  return (
    <div
      ref={ref}
      aria-hidden
      className="pointer-events-none absolute inset-0 z-[1] mix-blend-screen"
      style={{
        background:
          'radial-gradient(420px circle at var(--mx, 50%) var(--my, 30%), rgba(214,32,48,0.22), transparent 60%)',
        transition: 'background-position 220ms ease',
      }}
    />
  );
}
