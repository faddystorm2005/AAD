'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Mouse-following soft red glow for the hero. Subtle, premium - the kind of
 * effect you'd see on a luxury car website. Pure CSS transform on a single
 * div, no per-frame React state, no rerender churn.
 *
 * Renders null on touch devices, narrow screens, and when
 * prefers-reduced-motion is set. The mix-blend-screen overlay is expensive
 * to composite during scroll, so we avoid it entirely on mobile where the
 * cursor effect would be useless anyway.
 */
export default function HeroSpotlight() {
  const ref = useRef<HTMLDivElement>(null);
  // Start false to match SSR. Flip to true in useEffect only on devices
  // that have a real cursor and a wide-enough screen.
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const hasHover = window.matchMedia('(hover: hover)').matches;
    const wideEnough = window.innerWidth >= 1024;

    if (reducedMotion || !hasHover || !wideEnough) {
      return;
    }

    setEnabled(true);
  }, []);

  useEffect(() => {
    if (!enabled) return;
    const el = ref.current;
    if (!el) return;

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
  }, [enabled]);

  if (!enabled) return null;

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
