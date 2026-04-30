'use client';

interface Testimonial {
  name: string;
  text: string;
  vehicle?: string;
}

// Placeholder testimonials. Edit/swap these as real reviews come in.
const TESTIMONIALS: Testimonial[] = [
  {
    name: 'Sarah M.',
    vehicle: 'Tahoe',
    text: "Best detail I've ever had. Showed up on time and made my SUV look brand new.",
  },
  {
    name: 'Mike R.',
    vehicle: 'F-150',
    text: 'Booked Sunday night, got it done Monday morning. So convenient.',
  },
  {
    name: 'Jen K.',
    vehicle: 'Civic',
    text: 'Quality over quantity is right - he took his time and did it right.',
  },
  {
    name: 'Carlos V.',
    vehicle: 'Tacoma',
    text: 'Ceramic coating was worth every penny. Water just rolls off now.',
  },
  {
    name: 'Ashley T.',
    vehicle: 'Model 3',
    text: "I'll never go to a brick-and-mortar place again. He brings everything to my driveway.",
  },
];

/**
 * Auto-scrolling marquee of customer testimonials. The CSS keyframe
 * `aad-marquee` (in globals.css) translates the inner row by -50% which,
 * because we duplicate the items, produces a seamless loop. Pauses on
 * hover so users can stop and read.
 */
export default function MarqueeTestimonials() {
  const items = [...TESTIMONIALS, ...TESTIMONIALS];
  return (
    <div className="group relative overflow-hidden">
      {/* Edge fades so the marquee feels like it's continuous, not abruptly cut off. */}
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-black to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-black to-transparent" />
      <div className="animate-marquee flex gap-4 group-hover:[animation-play-state:paused]">
        {items.map((t, i) => (
          <div
            key={`${t.name}-${i}`}
            className="glass-card w-72 shrink-0 rounded-2xl p-5 sm:w-80"
          >
            <p className="text-sm leading-relaxed text-gray-200">
              &ldquo;{t.text}&rdquo;
            </p>
            <p className="mt-4 text-xs uppercase tracking-wider text-gray-500">
              <span className="text-red-400">{t.name}</span>
              {t.vehicle && <span className="text-gray-600"> · {t.vehicle}</span>}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
