'use client';

import { useEffect } from 'react';

/**
 * Adds a global click listener that fires a short haptic pulse on any
 * element with the `.press` class (buttons, CTAs). Uses the Vibration API
 * which is supported on Android Chrome and some desktop browsers. No-ops
 * silently on iOS and unsupported browsers.
 */
export default function HapticProvider() {
  useEffect(() => {
    if (!('vibrate' in navigator)) return;

    const onClick = (e: MouseEvent) => {
      const target = e.target as Element | null;
      if (!target) return;
      if (target.closest('.press')) {
        navigator.vibrate(8);
      }
    };

    document.addEventListener('click', onClick, { passive: true });
    return () => document.removeEventListener('click', onClick);
  }, []);

  return null;
}
