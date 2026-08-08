'use client';

import { useCallback, useSyncExternalStore } from 'react';

/**
 * Browser state read the way React wants it read.
 *
 * The obvious way to do this is `useState(false)` plus an effect that calls
 * `setEnabled(true)` once mounted. That works, but it renders twice on every
 * mount and trips `react-hooks/set-state-in-effect`. `useSyncExternalStore` is
 * built for exactly this: it reads from an external source during render,
 * returns a separate server snapshot so SSR and hydration agree, and
 * re-renders only when the source actually changes.
 */

const emptySubscribe = () => () => {};

/**
 * True once the component has hydrated on the client, false during SSR and on
 * the hydration pass. Use it to gate anything that needs a real DOM, such as a
 * portal target.
 */
export function useIsHydrated(): boolean {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
}

/**
 * Live result of a CSS media query. Returns false during SSR.
 *
 * Unlike the mount-effect version this replaces, the value updates when the
 * query starts or stops matching, so a viewport resize or a change to the OS
 * reduced-motion setting is picked up without a reload.
 */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      if (typeof window === 'undefined' || !window.matchMedia) return () => {};
      const mql = window.matchMedia(query);
      mql.addEventListener('change', onChange);
      return () => mql.removeEventListener('change', onChange);
    },
    [query]
  );

  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false
  );
}

/** Convenience wrapper: true when the user asked for reduced motion. */
export function usePrefersReducedMotion(): boolean {
  return useMediaQuery('(prefers-reduced-motion: reduce)');
}
