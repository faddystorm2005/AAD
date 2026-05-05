'use client';

import { useEffect, useRef, useState } from 'react';

interface LazyVideoProps {
  src: string;
  poster?: string;
  className?: string;
  ariaLabel?: string;
}

/**
 * Defers loading a video until it scrolls into view, but keeps the src
 * attribute always set so iOS Safari's autoplay rules behave predictably.
 *
 * iOS Safari requirements for muted autoplay (all must hold):
 *   - `muted` set as a DOM property (NOT just an attribute)
 *   - `playsinline` attribute present
 *   - `play()` called from an event handler, OR src must be loadable
 *
 * Past version used `src={shouldLoad ? src : undefined}` - the src toggle
 * can race with play() on iOS and silently fail. Now we keep src set and
 * use preload="none" to avoid the network cost until play() runs.
 */
export default function LazyVideo({ src, poster, className = '', ariaLabel }: LazyVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const startedRef = useRef(false);
  const [needsTap, setNeedsTap] = useState(false);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;

    // Belt-and-suspenders: set both DOM properties so iOS sees them
    // before any play() attempt.
    el.muted = true;
    el.playsInline = true;

    const tryPlay = () => {
      if (startedRef.current) return;
      startedRef.current = true;

      const playPromise = el.play();
      if (playPromise && typeof playPromise.catch === 'function') {
        playPromise.catch(() => {
          // Autoplay denied (rare with muted+playsinline, but power-saver
          // modes on iOS can still block). Show a tap-to-play overlay.
          startedRef.current = false;
          setNeedsTap(true);
        });
      }
    };

    if (typeof IntersectionObserver === 'undefined') {
      tryPlay();
      return;
    }

    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) tryPlay();
        });
      },
      { rootMargin: '200px', threshold: 0.01 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const handleTap = () => {
    const el = videoRef.current;
    if (!el) return;
    el.muted = true;
    el.playsInline = true;
    el.play().then(() => setNeedsTap(false)).catch(() => {
      /* still blocked - leave the overlay so the user knows it's tappable */
    });
  };

  return (
    <>
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        muted
        loop
        playsInline
        preload="none"
        aria-label={ariaLabel}
        className={className}
      />
      {needsTap && (
        <button
          type="button"
          onClick={handleTap}
          className="absolute inset-0 flex items-center justify-center bg-black/40 text-white"
          aria-label="Play video"
        >
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-red-600 shadow-lg">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M8 5v14l11-7z" />
            </svg>
          </span>
        </button>
      )}
    </>
  );
}
