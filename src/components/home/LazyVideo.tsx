'use client';

import { useEffect, useRef, useState } from 'react';

interface LazyVideoProps {
  src: string;
  poster?: string;
  className?: string;
  ariaLabel?: string;
}

/**
 * Lazy-loaded video that autoplays muted on mobile and desktop. Stays
 * cheap on first paint (preload="none"), and only loads the file when
 * it scrolls within 200px of the viewport.
 *
 * The trick that makes iOS Safari autoplay reliably: we don't call play()
 * until the `canplay` event fires. iOS rejects play() if the video has
 * zero buffered data - that's why the previous version showed a tap-to-
 * play overlay so often. Now we set preload="auto", wait for canplay,
 * then play(). Same flow as the desktop autoPlay attribute, just on
 * demand.
 *
 * Required for mobile muted-autoplay (all set):
 *   - muted DOM property (not just attribute)
 *   - playsinline DOM property
 *   - data buffered (canplay event fired)
 */
export default function LazyVideo({ src, poster, className = '', ariaLabel }: LazyVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const startedRef = useRef(false);
  const [needsTap, setNeedsTap] = useState(false);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;

    // Force-set DOM properties (more reliable than React attributes on
    // iOS Safari, which sometimes ignores attribute changes for these).
    el.muted = true;
    el.playsInline = true;

    const playWhenReady = () => {
      if (startedRef.current) return;
      startedRef.current = true;

      const start = () => {
        const p = el.play();
        if (p && typeof p.catch === 'function') {
          p.catch(() => {
            // Autoplay actually denied (rare with muted+playsinline+canplay).
            // Reset so the overlay/tap retry can recover.
            startedRef.current = false;
            setNeedsTap(true);
          });
        }
      };

      // If the video is already ready (cached, fast network) we can play
      // immediately. Otherwise wait for canplay so iOS has buffered data
      // before play() is invoked.
      if (el.readyState >= 3 /* HAVE_FUTURE_DATA */) {
        start();
      } else {
        const onReady = () => {
          el.removeEventListener('canplay', onReady);
          start();
        };
        el.addEventListener('canplay', onReady, { once: true });
        // Bump preload + trigger a load so the canplay event will actually
        // fire. preload was "none" so the browser has done nothing yet.
        el.preload = 'auto';
        el.load();
      }
    };

    if (typeof IntersectionObserver === 'undefined') {
      playWhenReady();
      return;
    }

    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) playWhenReady();
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
      /* still blocked - leave overlay up */
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
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-gold-600 shadow-lg">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M8 5v14l11-7z" />
            </svg>
          </span>
        </button>
      )}
    </>
  );
}
