'use client';

import { useEffect, useRef, useState } from 'react';

interface AmbientVideoProps {
  src: string;
  className?: string;
}

/**
 * Background cinemagraph layer. Sits absolutely over a still image and
 * fades in only once it can actually play, so the still is always the
 * fallback and nothing ever flashes or blocks first paint.
 *
 * Deliberately conservative about when it loads at all:
 *   - never with prefers-reduced-motion
 *   - never when the user has Save-Data on
 *   - never on small screens (phones keep the light, fast still)
 *   - only once it scrolls within 300px of the viewport
 * On any playback error it removes itself and the still remains.
 */
export default function AmbientVideo({ src, className = '' }: AmbientVideoProps) {
  const holderRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [load, setLoad] = useState(false);
  const [on, setOn] = useState(false);
  const [dead, setDead] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (window.matchMedia('(max-width: 767px)').matches) return;
    const conn = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
    if (conn?.saveData) return;

    const el = holderRef.current;
    if (!el || !('IntersectionObserver' in window)) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setLoad(true);
          io.disconnect();
        }
      },
      { rootMargin: '300px 0px' }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!load) return;
    const el = videoRef.current;
    if (!el) return;
    el.muted = true;
    el.playsInline = true;
    const onCanPlay = () => {
      const p = el.play();
      if (p && typeof p.then === 'function') {
        p.then(() => setOn(true)).catch(() => setDead(true));
      } else {
        setOn(true);
      }
    };
    el.addEventListener('canplay', onCanPlay, { once: true });
    return () => el.removeEventListener('canplay', onCanPlay);
  }, [load]);

  if (dead) return null;

  return (
    <div ref={holderRef} aria-hidden className={`pointer-events-none absolute inset-0 ${className}`}>
      {load && (
        <video
          ref={videoRef}
          src={src}
          loop
          muted
          playsInline
          preload="auto"
          onError={() => setDead(true)}
          className="absolute inset-0 h-full w-full object-cover transition-opacity duration-[1400ms]"
          style={{ opacity: on ? 1 : 0 }}
        />
      )}
    </div>
  );
}
