// Customer testimonials shown in the homepage marquee. These are the
// baked-in defaults; Alex can replace any of them from the Maus & Co.
// client portal (Reviews section), and lib/cms.ts merges his edits
// over these slot by slot. A blank portal slot keeps the default.

export interface Testimonial {
  name: string;
  text: string;
  vehicle?: string;
  rating: number;
}

export const DEFAULT_TESTIMONIALS: Testimonial[] = [
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
    text: 'Quality over quantity is right. He took his time and did it right.',
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
    text: "Worth every dollar. My paint has never looked this good. Like driving off the lot again.",
  },
  {
    name: 'Priya S.',
    vehicle: 'RAV4',
    rating: 5,
    text: "Super professional, no mess, and it smelled amazing when I got in. Already booked again.",
  },
];
