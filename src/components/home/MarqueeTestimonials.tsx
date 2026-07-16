'use client';

import { useRef, useState, useCallback } from 'react';

import { DEFAULT_TESTIMONIALS, type Testimonial } from '@/lib/testimonialData';

function StarRating({ count }: { count: number }) {
  return (
    <div className="flex gap-0.5 text-yellow-400" aria-label={`${count} out of 5 stars`}>
      {Array.from({ length: count }).map((_, i) => (
        <svg key={i} width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      ))}
    </div>
  );
}

export default function MarqueeTestimonials({
  testimonials,
}: {
  // Live reviews from the client portal; falls back to the baked-in set.
  testimonials?: Testimonial[];
}) {
  const source =
    testimonials && testimonials.length > 0 ? testimonials : DEFAULT_TESTIMONIALS;
  const items = [...source, ...source];
  const [touchPaused, setTouchPaused] = useState(false);
  const resumeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleTouchStart = useCallback(() => {
    if (resumeTimer.current) clearTimeout(resumeTimer.current);
    setTouchPaused(true);
  }, []);

  const handleTouchEnd = useCallback(() => {
    resumeTimer.current = setTimeout(() => setTouchPaused(false), 1500);
  }, []);

  const paused = touchPaused;

  return (
    <div
      className="group relative overflow-hidden"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-black to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-black to-transparent" />
      <div
        className={`marquee-track flex gap-4 group-hover:[animation-play-state:paused] ${paused ? '[animation-play-state:paused]' : ''}`}
      >
        {items.map((t, i) => (
          <div
            key={`${t.name}-${i}`}
            className="glass-card flex w-72 shrink-0 flex-col gap-3 rounded-2xl p-5 sm:w-80"
          >
            <StarRating count={t.rating} />
            <p className="flex-1 text-base leading-relaxed text-gray-100">
              &ldquo;{t.text}&rdquo;
            </p>
            <p className="text-sm uppercase tracking-wider text-gray-300">
              <span className="text-red-300">{t.name}</span>
              {t.vehicle && <span className="text-gray-300"> &middot; {t.vehicle}</span>}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
