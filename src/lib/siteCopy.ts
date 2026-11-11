/**
 * Every word and photo on the public pages, as shipped. The keys are the dot
 * paths Alex edits in the Maus & Co. portal; when a portal value is blank or
 * missing, the text here renders, so the site always looks exactly like this
 * with an empty portal. Read it through createCopy() in cmsContent.ts.
 *
 * Kept free of imports so scripts/build-portal-seed.mjs can load it in Node.
 * The FAQ and availability defaults live in cms.ts (older portal keys) and
 * the per-city copy lives in cityPages.ts.
 */

export const SITE_COPY_DEFAULTS = {
  seo: {
    home: {
      title: 'Mobile Car Detailing in Phoenix, AZ | Signature Mobile Detailing',
      description:
        'Mobile car detailing in Phoenix, Scottsdale, Tempe, Mesa and Chandler. Interior, exterior, ceramic coating and paint correction at your driveway or office.',
    },
  },
  contact: {
    alex_name: 'Alex',
    alex_phone: '(480) 793-3782',
    kane_name: 'Kane',
    kane_phone: '(602) 881-5602',
    email: 'info@signaturemobiledetailaz.com',
    heading: 'Contact Signature Mobile Detailing',
    lead: 'Mobile detailing across Phoenix, Scottsdale, Tempe, Mesa, Chandler, Gilbert, Glendale, and Peoria.',
    book_link: 'book online',
    closing: "We'll confirm within 24 hours.",
    map_label: 'Service Area',
  },
  header: {
    book_label: 'Book Now',
  },
  buttons: {
    sticky_book: '🚗 Book Now',
    bar_call: 'Call',
    bar_book: 'Book Now →',
  },
  hero: {
    photo: '/images/aad/hero-s-class.jpg',
    eyebrow: 'Quality Over Quantity',
    heading_line1: 'Mobile Detailing',
    heading_line2: 'in Phoenix',
    intro:
      "Professional detailing brought right to your driveway, office, or garage across Phoenix, Scottsdale, Tempe, Mesa, Chandler, and Gilbert. We bring everything we need. You don't lift a finger.",
    book_label: 'Book Mobile Detailing →',
    explore_label: 'Explore Services',
    call_prompt: 'Prefer to call?',
  },
  stats: {
    label_1: 'Booking Confirmation',
    label_2: 'Faith-Driven Service',
    label_3: 'Showroom-Ready, Guaranteed',
  },
  services: {
    heading: 'Our Mobile Detailing Services',
    intro_before: 'Every package is tailored to your vehicle. We come to you for',
    link_1: 'Phoenix car detailing',
    link_2: 'auto detailing services',
    intro_after: 'and ceramic coatings. No driving across town, no waiting rooms.',
    details_label: "What's included",
    hide_label: 'Hide details',
    book_label: 'Book this service →',
    cards: [
      {
        title: 'Full Detail',
        description:
          'Complete interior and exterior reset. Hand wash, decontamination, and clay bar outside. Vacuum, shampoo, and full surface dressing inside.',
        price_note: '',
      },
      {
        title: 'Exterior Detailing',
        description:
          'Hand wash, decontamination, clay bar, and trim/tire dressing. Your paint reset to like-new.',
        price_note: '',
      },
      {
        title: 'Interior Detailing',
        description:
          'Vacuum, shampoo carpets and seats, wipe and dress every surface. Cabin completely reset.',
        price_note: '',
      },
      {
        title: 'Ceramic Coating',
        description:
          'Premium clear coat that lasts up to 10 years. Adds deep gloss and shields paint from UV, water spots, and contaminants.',
        price_note: 'Quote',
      },
      {
        title: 'Mobile - We Come To You',
        description:
          'Driveway, office parking lot, garage - anywhere in the Phoenix valley. Three slots a day so you get our full attention.',
        price_note: '',
      },
    ],
  },
  pricing_text: {
    heading: 'Pricing',
    intro:
      'Flat rates by vehicle size. Travel included, no surprise fees. Nothing to pay up front, you pay on-site once the work is done.',
    popular_badge: 'Most Popular',
    includes_full_detail: [
      'Complete exterior detail',
      'Complete interior detail',
      'Door jamb cleaning',
      'Biggest transformation, best value',
    ],
    includes_interior: [
      'Full vacuum: seats, floor, trunk',
      'Dashboard & console detail',
      'Door panels & pockets',
      'Interior windows',
      'Floor mat cleaning',
    ],
    includes_exterior: [
      'Hand wash & dry',
      'Clay bar treatment',
      'Wheel & tire cleaning',
      'Exterior windows',
      'Tire dressing & shine',
    ],
    size_small: 'Coupe / Sedan',
    size_suv: 'SUV',
    size_truck: 'Truck / 3-Row',
    book_prefix: 'Book',
    addons_heading: 'Add-On Services',
    returning_before: 'Returning customer?',
    returning_after: 'off, no code needed.',
    returning_note:
      'The discount is applied automatically at checkout. Final quote may adjust for vehicle condition.',
  },
  results: {
    heading: 'The Results',
    intro: 'Real vehicles, real finishes. This is the standard every detail is held to.',
    items: [
      { photo: '/images/aad/gallery-ford-super-duty.jpg', vehicle: 'Ford Super Duty', service: 'Full Interior Detail' },
      { photo: '/images/aad/gallery-mercedes-gle-interior.jpg', vehicle: 'Mercedes GLE', service: 'Interior Deep Clean' },
      { photo: '/images/aad/gallery-audi-s4-red-leather.jpg', vehicle: 'Audi S4', service: 'Leather Conditioning' },
      { photo: '/images/aad/gallery-toyota-tundra-console.jpg', vehicle: 'Toyota Tundra', service: 'Interior Detail' },
      { photo: '/images/aad/gallery-nissan-rogue-interior.jpg', vehicle: 'Nissan Rogue', service: 'Interior Detail' },
      { photo: '/images/aad/gallery-bmw-engine-bay.jpg', vehicle: 'BMW', service: 'Engine Bay Detail' },
      { photo: '/images/aad/gallery-suv-cargo-area.jpg', vehicle: 'SUV', service: 'Cargo Area Clean' },
      { photo: '/images/aad/gallery-ford-king-ranch.jpg', vehicle: 'Ford King Ranch', service: 'Full Detail' },
    ],
  },
  tiktok: {
    eyebrow: 'Behind the Scenes',
    heading: 'Watch Every Detail Live',
    text:
      'Before and afters. Deep-clean transformations. The satisfying moments most customers never see. Real cars, real Phoenix drivers. Follow along and see what yours could look like.',
    button: 'Follow @signaturedetailingco →',
    note: 'Free to watch & follow',
  },
  how: {
    heading: 'How It Works',
    intro: "Booking mobile detailing in Phoenix takes about a minute. Here's how it goes:",
    more_label: 'Learn more',
    hide_label: 'Hide',
    steps: [
      {
        number: 'Step 1',
        title: 'Pick a slot',
        description:
          '9 AM, 1 PM, or 5 PM, any day. Real-time availability. No calls, no back-and-forth.',
      },
      {
        number: 'Step 2',
        title: 'We confirm',
        description:
          'Signature Mobile Detailing reviews your booking within 24 hours. No charge until we approve.',
      },
      {
        number: 'Step 3',
        title: 'We come to you',
        description:
          "On the day of service, our team arrives at your address with everything we need. Our van is fully self-contained: we bring our own water and power. You don't move a thing.",
      },
    ],
  },
  why: {
    heading: 'Why Signature Mobile Detailing',
    reasons: [
      {
        headline: 'Convenience',
        title: 'We come to you',
        description:
          'Driveway, office, or garage - our van is fully self-contained. No driving across town, no waiting rooms.',
      },
      {
        headline: 'Quality',
        title: 'Quality over quantity',
        description:
          'Six details a day max. Your car gets focus and care, not assembly-line speed. Showroom-ready, guaranteed.',
      },
      {
        headline: 'Fair Price',
        title: 'No surprises, no travel fees',
        description:
          'Flat rates with travel included. Returning-customer discount on every visit. What you see is what you pay.',
      },
    ],
  },
  value: {
    eyebrow: 'The Real Value',
    heading: 'Get Your Saturday Back',
    stat_label: 'saved per detail',
    text:
      'No drop-off. No shop waiting room. No pickup. No Uber both ways. We work in your driveway while you keep your day.',
    pillars: [
      {
        title: 'Owner-Operated',
        description:
          'Alex and Kane own the business fifty-fifty and do every detail themselves. No revolving crew of contractors. Call us and you get an owner, not a call center.',
      },
      {
        title: 'Showroom-Ready, Guaranteed',
        description:
          "Not happy with how something turned out? We make it right before we leave. That's the standard.",
      },
      {
        title: 'Nothing to Pay Up Front',
        description:
          "No deposit, no card needed to book. You pay on-site after the detail is done and you've seen the work.",
      },
    ],
  },
  mission: {
    eyebrow: 'Our Mission',
    quote:
      'Keep every car looking brand new. The one you drive home in should feel like the one you drove off the lot.',
    text:
      "We treat every vehicle like it's our own. That's why we cap at six details a day, bring everything to your door, and don't cut a single corner. Cars take you to the people and places that matter, so they should look the part.",
    owners: 'Alex Browning & Kane Pexa, Owners',
    verse: 'Commit your work to the Lord, and your plans will be established.',
    verse_ref: 'Prov. 16:3',
  },
  faq: {
    heading: 'Frequently Asked Questions',
    footer_before: 'Still have questions?',
    contact_link: 'Contact us',
    book_link: 'book a detail',
    footer_after: 'to get started.',
  },
  watch: {
    heading: 'Watch Us Work',
    intro: 'Real jobs. Real results.',
  },
  cta: {
    photo: '/images/aad/cta-king-ranch.jpg',
    eyebrow: 'Ready when you are',
    heading: 'Mobile Detailing in Phoenix',
    text:
      "Quality on-site detailing brought to you. Pick a slot, we'll show up with everything we need. No deposit, you pay on-site once the work is done.",
    button: 'Book Now →',
  },
  footer: {
    brand: 'Signature Mobile Detailing',
    tagline: 'Faith-driven, owner-operated',
    blurb:
      'Mobile detailing in Phoenix, AZ and across the valley. Quality over quantity. We come to you for interior, exterior, ceramic coatings, paint correction, and more.',
    copyright_line: 'Mobile detailing in Phoenix, AZ.',
    formerly: 'Formerly Austin Auto Detail.',
    verse: 'Whatever you do, work at it with all your heart, as working for the Lord.',
    verse_ref: 'Col. 3:23',
  },
  city: {
    eyebrow: 'Quality Over Quantity',
    book_label: 'Book Mobile Detailing →',
    call_prefix: 'Call',
    owner_heading: 'Owner-Operated, Every Time',
    owner_text:
      'Alex Browning and Kane Pexa own the business fifty-fifty and do every detail themselves. No contractors, no rotating crew. We cap the schedule at six details a day so your car gets real attention instead of assembly-line speed.',
    services_text:
      'Interior and exterior detailing, ceramic coatings, one and two step paint correction, engine bay cleaning, headlight restoration, pet hair removal, and leather conditioning.',
    pricing_link: 'See full pricing',
    cta_heading: 'Ready When You Are',
    cta_before: 'Call or text Alex at',
    cta_after: 'or book online in about a minute.',
    cta_button: 'Book Now →',
  },
};
