'use client';

import { useEffect, useRef } from 'react';
import {
  useIsHydrated,
  useMediaQuery,
  usePrefersReducedMotion,
} from '@/lib/useBrowserState';

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
  // Every hook runs unconditionally; the gating happens after. All four read
  // false during SSR, so the server and the hydration pass agree.
  const hydrated = useIsHydrated();
  const reducedMotion = usePrefersReducedMotion();
  const hasHover = useMediaQuery('(hover: hover)');
  // Was `window.innerWidth >= 1024` read once on mount. As a media query it
  // now also turns the effect off if the window is resized narrow.
  const wideEnough = useMediaQuery('(min-width: 1024px)');

  const enabled = hydrated && !reducedMotion && hasHover && wideEnough;

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
          'radial-gradient(420px circle at var(--mx, 50%) var(--my, 30%), rgba(212,162,76,0.22), transparent 60%)',
        transition: 'background-position 220ms ease',
      }}
    />
  );
}
