'use client';

import { AAD_GALLERY } from '@/lib/siteImages';

export default function GalleryStrip() {
  return (
    <section className="space-y-3">
      <div className="flex items-baseline justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-[0.35em] text-red-500">
          Our Work
        </h2>
        <span className="text-xs text-gray-500">Scroll →</span>
      </div>
      <div className="-mx-6 overflow-x-auto px-6 pb-2">
        <div className="flex gap-3 snap-x snap-mandatory">
          {AAD_GALLERY.map((photo) => (
            <div
              key={photo.src}
              className="relative aspect-[3/4] w-44 flex-shrink-0 snap-start overflow-hidden rounded-xl border border-white/10 bg-gray-900"
            >
              <img
                src={photo.src}
                alt={photo.alt}
                loading="lazy"
                className="h-full w-full object-cover transition-transform duration-500 hover:scale-105"
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
