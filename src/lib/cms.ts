import 'server-only';

import { DEFAULT_TESTIMONIALS, type Testimonial } from '@/lib/testimonialData';

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

type CmsContent = {
  availability?: string;
  faqs?: Array<{ q?: string; a?: string }>;
  reviews?: Array<{ name?: string; vehicle?: string; text?: string }>;
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
  reviews: Testimonial[];
};

export async function getLiveContent(): Promise<LiveContent> {
  const cms = await fetchCms();
  return {
    availability: cms?.availability || DEFAULT_AVAILABILITY,
    faqs: DEFAULT_FAQS.map((base, i) => ({
      question: cms?.faqs?.[i]?.q || base.question,
      answer: cms?.faqs?.[i]?.a || base.answer,
    })),
    // Reviews merge slot by slot: a blank portal field keeps the default,
    // so a half-edited review can never blank the marquee.
    reviews: DEFAULT_TESTIMONIALS.map((base, i) => ({
      name: cms?.reviews?.[i]?.name || base.name,
      vehicle: cms?.reviews?.[i]?.vehicle || base.vehicle,
      text: cms?.reviews?.[i]?.text || base.text,
      rating: 5,
    })),
  };
}
