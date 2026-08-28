import 'server-only';

/**
 * Live content layer for the Maus & Co. client portal.
 *
 * Alex edits his content at mausandco.com/portal (email + access code). The
 * values live in a read-only public view and are pulled here at render time
 * with a short cache. Every helper falls back to the constants baked into
 * this repo, so the site can never break because of the portal. The portal
 * pings /api/revalidate after each save, so edits appear within seconds.
 */

const CMS_URL =
  'https://uitwrgxckeckfximxxai.supabase.co/rest/v1/portal_public_content' +
  '?slug=eq.aad&select=content';
// Publishable key: safe to ship in code by design (read-only public view).
const CMS_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVpdHdyZ3hja2Vja2Z4aW14eGFpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk1ODUwMzcsImV4cCI6MjA5NTE2MTAzN30.lqMLS_iyaKgi-PutwgH3Q6iFRptb5fMXu-7Ju4tdx8s';

export type FaqItem = { question: string; answer: string };

// The baked-in defaults. If the portal is unreachable or a field is blank,
// these render, exactly as the site shipped.
export const DEFAULT_FAQS: FaqItem[] = [
  {
    question: 'Where do you offer mobile detailing in Phoenix?',
    answer:
      'We service Phoenix and surrounding areas. Our detail van is fully self-contained - we bring our own water and power, so all you need is a spot for the vehicle. Driveway, office parking lot, or garage all work.',
  },
  {
    question: 'How long does a typical detail take?',
    answer:
      'Most interior + exterior details take 2–3 hours. Paint correction adds 1–2 hours. Ceramic coatings are a full-day job - that’s why we only book one ceramic coating per day at the 9 AM slot.',
  },
  {
    question: 'Do I need to be home during the service?',
    answer:
      'Not necessarily. As long as we have access to the vehicle and the agreed location, you can be at work or running errands. We’ll send updates as we progress.',
  },
  {
    question: 'How does payment work?',
    answer:
      'There is no deposit and nothing to pay up front. Send your request, we approve it and text you to lock in a time, and you pay the full amount on-site once the detail is done and you have seen the work.',
  },
  {
    question: 'What’s included in Phoenix car cleaning?',
    answer:
      'Our base detail covers a full exterior wash, hand-dry, vacuum, interior wipe-down, window cleaning, and tire dressing. Add-ons cover wax, paint correction, ceramic coating, engine bay cleaning, leather conditioning, stain removal, and windshield treatment.',
  },
  {
    question: 'Can I cancel or reschedule?',
    answer:
      "Yes. To reschedule, open your booking and pick a new time. You can do that yourself any time before service. To cancel, tap Request Cancellation and add a quick reason. We'll review within 24 hours. Since nothing is paid up front, there is no deposit to refund.",
  },
];

export const DEFAULT_AVAILABILITY = 'Available 7 days a week, by appointment.';

export type Review = { name: string; text: string; vehicle: string };

// Reviews have NO baked-in defaults, deliberately, and this is the one field
// on this page that works that way. Everything else here (availability, faqs,
// service copy) falls back to a constant so the site can never render blank.
// A testimonial is different: a fallback would mean shipping words attributed
// to a named customer that the customer's own row does not contain. If the
// portal row is empty or unreachable, the homepage shows no reviews section at
// all rather than something we made up.

export type ServiceCopy = { title: string; description: string };

// The five real services Alex sells. The six "why us" cards further down the
// homepage share the same card component but are site copy, not client
// content, so they stay hardcoded and out of the portal.
export const DEFAULT_SERVICE_COPY: ServiceCopy[] = [
  {
    title: 'Full Detail',
    description:
      'Complete interior and exterior reset. Hand wash, decontamination, and clay bar outside. Vacuum, shampoo, and full surface dressing inside.',
  },
  {
    title: 'Exterior Detailing',
    description:
      'Hand wash, decontamination, clay bar, and trim/tire dressing. Your paint reset to like-new.',
  },
  {
    title: 'Interior Detailing',
    description:
      'Vacuum, shampoo carpets and seats, wipe and dress every surface. Cabin completely reset.',
  },
  {
    title: 'Ceramic Coating',
    description:
      'Premium clear coat that lasts up to 10 years. Adds deep gloss and shields paint from UV, water spots, and contaminants.',
  },
  {
    title: 'Mobile - We Come To You',
    description:
      'Driveway, office parking lot, garage - anywhere in the Phoenix valley. Three slots a day so you get our full attention.',
  },
];

type CmsContent = {
  availability?: string;
  faqs?: Array<{ q?: string; a?: string }>;
  // Stored shape is name / text / vehicle. It is not quote / name / month.
  reviews?: Array<{ name?: string; text?: string; vehicle?: string }>;
  services?: Array<{ title?: string; description?: string }>;
};

async function fetchCms(): Promise<CmsContent | null> {
  try {
    const res = await fetch(CMS_URL, {
      headers: { apikey: CMS_KEY, Authorization: `Bearer ${CMS_KEY}` },
      next: { revalidate: 300, tags: ['cms'] },
    });
    if (!res.ok) return null;
    const rows = (await res.json()) as Array<{ content?: CmsContent }>;
    return rows?.[0]?.content ?? null;
  } catch {
    return null;
  }
}

export type LiveContent = {
  availability: string;
  faqs: FaqItem[];
  reviews: Review[];
  services: ServiceCopy[];
};

// Every field falls back to its baked-in default, the same way faqs and the
// live price table already do, so a blank or missing portal value can never
// render an empty card or a missing name.
export async function getLiveContent(): Promise<LiveContent> {
  const cms = await fetchCms();
  const clean = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : '');
  return {
    availability: cms?.availability || DEFAULT_AVAILABILITY,
    faqs: DEFAULT_FAQS.map((base, i) => ({
      question: cms?.faqs?.[i]?.q || base.question,
      answer: cms?.faqs?.[i]?.a || base.answer,
    })),
    // Length comes from the portal row, not from a defaults array. An entry
    // needs a name and a quote to be worth showing; vehicle is optional and
    // the card omits it when blank.
    reviews: (cms?.reviews ?? [])
      .map((r) => ({
        name: clean(r?.name),
        text: clean(r?.text),
        vehicle: clean(r?.vehicle),
      }))
      .filter((r) => r.name !== '' && r.text !== ''),
    services: DEFAULT_SERVICE_COPY.map((base, i) => ({
      title: clean(cms?.services?.[i]?.title) || base.title,
      description: clean(cms?.services?.[i]?.description) || base.description,
    })),
  };
}
