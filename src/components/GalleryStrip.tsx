'use client';

import { AAD_GALLERY } from '@/lib/siteImages';

export default function GalleryStrip() {
  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold uppercase tracking-[0.35em] text-gold-500">
        Detailing We Love
      </h2>
      <p className="max-w-2xl text-sm text-gray-300">
        A handpicked look at the finishes that set the bar. The kind of work
        that motivates every detail on our calendar.
      </p>
      <div className="group relative -mx-6 overflow-hidden">
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-12 bg-gradient-to-r from-black to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-12 bg-gradient-to-l from-black to-transparent" />
        <div className="marquee-track-gallery flex gap-3 group-hover:[animation-play-state:paused]">
          {[...AAD_GALLERY, ...AAD_GALLERY].map((photo, i) => (
            <div
              key={`${photo.src}-${i}`}
              className="relative aspect-[3/4] w-44 flex-shrink-0 overflow-hidden rounded-xl border border-white/10 bg-gray-900"
            >
              <img
                src={photo.src}
                alt={photo.alt}
                loading="lazy"
                className="h-full w-full object-cover"
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
