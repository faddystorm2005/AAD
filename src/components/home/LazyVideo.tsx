'use client';

import { useEffect, useRef, useState } from 'react';

interface LazyVideoProps {
  src: string;
  poster?: string;
  className?: string;
  ariaLabel?: string;
}

/**
 * Defer-loads a video until it scrolls into view. Avoids the page-load
 * lag that comes with auto-playing a large 4K/60fps file on first paint:
 * the <video> stays src-less (so the browser fetches nothing) until the
 * IntersectionObserver fires, then we attach the src and call play().
 *
 * Falls back to immediate load if IntersectionObserver isn't available
 * (very old browsers).
 */
export default function LazyVideo({ src, poster, className = '', ariaLabel }: LazyVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [shouldLoad, setShouldLoad] = useState(false);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;

    if (typeof IntersectionObserver === 'undefined') {
      setShouldLoad(true);
      return;
    }

    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setShouldLoad(true);
            obs.disconnect();
          }
        });
      },
      { rootMargin: '200px' } // Start loading 200px before it enters view
    );

    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // Once shouldLoad flips, attach src and try to play. Autoplay can fail
  // silently on iOS if the tab is backgrounded - that's fine, the user
  // can tap to play (controls aren't shown but the poster will display).
  useEffect(() => {
    if (!shouldLoad || !videoRef.current) return;
    videoRef.current.load();
    const playPromise = videoRef.current.play();
    if (playPromise && typeof playPromise.catch === 'function') {
      playPromise.catch(() => {
        /* autoplay blocked - poster stays visible */
      });
    }
  }, [shouldLoad]);

  return (
    <video
      ref={videoRef}
      src={shouldLoad ? src : undefined}
      poster={poster}
      muted
      loop
      playsInline
      preload="none"
      aria-label={ariaLabel}
      className={className}
    />
  );
}
