'use client';

interface Testimonial {
  name: string;
  text: string;
  vehicle?: string;
  rating: number;
}

const TESTIMONIALS: Testimonial[] = [
  {
    name: 'Sarah M.',
    vehicle: 'Tahoe',
    rating: 5,
    text: "Best detail I've ever had. Showed up on time and made my SUV look brand new.",
  },
  {
    name: 'Mike R.',
    vehicle: 'F-150',
    rating: 5,
    text: 'Booked Sunday night, got it done Monday morning. So convenient.',
  },
  {
    name: 'Jen K.',
    vehicle: 'Civic',
    rating: 5,
    text: 'Quality over quantity is right — he took his time and did it right.',
  },
  {
    name: 'Carlos V.',
    vehicle: 'Tacoma',
    rating: 5,
    text: 'Ceramic coating was worth every penny. Water just rolls off now.',
  },
  {
    name: 'Ashley T.',
    vehicle: 'Model 3',
    rating: 5,
    text: "I'll never go to a brick-and-mortar place again. He brings everything to my driveway.",
  },
  {
    name: 'Jordan B.',
    vehicle: 'Mustang',
    rating: 5,
    text: "Worth every dollar. My paint has never looked this good — like driving off the lot again.",
  },
  {
    name: 'Priya S.',
    vehicle: 'RAV4',
    rating: 5,
    text: "Super professional, no mess, and it smelled amazing when I got in. Already booked again.",
  },
];

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

/**
 * Auto-scrolling marquee of customer testimonials. Pauses on hover so
 * users can stop and read. Duplicated array produces a seamless loop.
 */
export default function MarqueeTestimonials() {
  const items = [...TESTIMONIALS, ...TESTIMONIALS];
  return (
    <div className="group relative overflow-hidden">
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-black to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-black to-transparent" />
      <div className="animate-marquee flex gap-4 group-hover:[animation-play-state:paused]">
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
              {t.vehicle && <span className="text-gray-400"> · {t.vehicle}</span>}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
