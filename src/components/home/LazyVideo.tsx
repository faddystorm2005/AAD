'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

interface LazyVideoProps {
  src: string;
  poster?: string;
  className?: string;
  ariaLabel?: string;
  /**
   * Render the tap-to-play overlay when autoplay is held back. Set false
   * when this video sits inside a link or other interactive element: a
   * nested <button> is invalid HTML there and would swallow the tap that
   * is supposed to follow the link. Those call sites just show the poster.
   */
  tapToPlay?: boolean;
}

/**
 * Lazy-loaded showcase video. Stays cheap on first paint (preload="none")
 * and only fetches the file when it scrolls within 200px of the viewport.
 *
 * Autoplay is not automatic. We hold back and show the poster with a play
 * button whenever autoplaying would be rude or expensive:
 *   - prefers-reduced-motion, an accessibility request we must honor
 *   - Save-Data, an explicit "stop spending my bandwidth" signal
 *   - small screens, where these clips are the bulk of the page weight and
 *     the visitor is most likely on cellular
 * The content is still one tap away in all three cases, so nothing is lost;
 * it just is not forced on anyone. This mirrors AmbientVideo, which skips
 * the same three cases outright.
 *
 * The trick that makes iOS Safari autoplay reliably: we don't call play()
 * until the `canplay` event fires. iOS rejects play() if the video has zero
 * buffered data - that's why an earlier version showed the tap-to-play
 * overlay so often. We bump preload to "auto", wait for canplay, then play().
 *
 * Required for mobile muted-autoplay (all set):
 *   - muted DOM property (not just attribute)
 *   - playsinline DOM property
 *   - data buffered (canplay event fired)
 */
export default function LazyVideo({
  src,
  poster,
  className = '',
  ariaLabel,
  tapToPlay = true,
}: LazyVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const startedRef = useRef(false);
  const [needsTap, setNeedsTap] = useState(false);

  // Load the file, then play once it has enough data. Shared by the autoplay
  // path and the tap path: with preload="none" both start at readyState 0 and
  // both need the canplay wait, which the old tap handler skipped.
  const startPlayback = useCallback(() => {
    const el = videoRef.current;
    if (!el || startedRef.current) return;
    startedRef.current = true;

    // Force-set DOM properties (more reliable than React attributes on iOS
    // Safari, which sometimes ignores attribute changes for these).
    el.muted = true;
    el.playsInline = true;

    const start = () => {
      const p = el.play();
      if (p && typeof p.catch === 'function') {
        p.catch(() => {
          // Autoplay actually denied (rare with muted+playsinline+canplay).
          // Reset so the tap retry can recover.
          startedRef.current = false;
          setNeedsTap(true);
        });
      }
    };

    if (el.readyState >= 3 /* HAVE_FUTURE_DATA */) {
      start();
      return;
    }
    const onReady = () => {
      el.removeEventListener('canplay', onReady);
      start();
    };
    el.addEventListener('canplay', onReady, { once: true });
    // preload was "none" so the browser has done nothing yet; without this
    // the canplay event would never fire.
    el.preload = 'auto';
    el.load();
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const smallScreen = window.matchMedia('(max-width: 767px)').matches;
    const conn = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
    const saveData = Boolean(conn?.saveData);

    // Hold: show the poster and wait for an explicit tap. Not one byte of
    // video is fetched until the visitor asks for it.
    if (reduceMotion || smallScreen || saveData) {
      setNeedsTap(true);
      return;
    }

    const el = videoRef.current;
    if (!el) return;

    if (typeof IntersectionObserver === 'undefined') {
      startPlayback();
      return;
    }

    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) startPlayback();
        });
      },
      { rootMargin: '200px', threshold: 0.01 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [startPlayback]);

  const handleTap = () => {
    setNeedsTap(false);
    startedRef.current = false;
    startPlayback();
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
      {needsTap && tapToPlay && (
        <button
          type="button"
          onClick={handleTap}
          className="absolute inset-0 flex items-center justify-center bg-black/30 text-white transition-colors hover:bg-black/40"
          aria-label={ariaLabel ? `Play video: ${ariaLabel}` : 'Play video'}
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
