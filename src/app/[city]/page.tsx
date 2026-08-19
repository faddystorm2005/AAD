import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getLiveContent } from '@/lib/cms';
import { CITIES, getCity, SITE_URL } from '@/lib/cityPages';
import SiteHeader from '@/components/home/SiteHeader';
import SiteFooter from '@/components/home/SiteFooter';

/**
 * City landing pages (/scottsdale, /tempe, ...) driven by the CITIES map
 * in src/lib/cityPages.ts. One template, five prerendered static pages.
 * Unknown slugs 404 (dynamicParams = false).
 */

export const dynamicParams = false;

export function generateStaticParams() {
  return CITIES.map((c) => ({ city: c.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ city: string }>;
}): Promise<Metadata> {
  const { city } = await params;
  const page = getCity(city);
  if (!page) return {};
  return {
    title: page.title,
    description: page.description,
    // The root layout sets canonical "/" for the homepage. Every city page
    // must claim its own path or all five would point Google at the homepage.
    alternates: { canonical: `/${page.slug}` },
    openGraph: {
      title: page.title,
      description: page.description,
      url: `${SITE_URL}/${page.slug}`,
    },
    twitter: {
      title: page.title,
      description: page.description,
    },
  };
}

// Copy shared by every city page. Held once here so the five pages can
// never drift apart. The per-city voice lives in the CITIES map.
const OWNER_LINE =
  'Alex Browning and Kane Pexa own the business fifty-fifty and do every detail themselves. No contractors, no rotating crew. We cap the schedule at six details a day so your car gets real attention instead of assembly-line speed.';
const SERVICES_LINE =
  'Interior and exterior detailing, ceramic coatings, one and two step paint correction, engine bay cleaning, headlight restoration, pet hair removal, and leather conditioning.';

export default async function CityPage({
  params,
}: {
  params: Promise<{ city: string }>;
}) {
  const { city } = await params;
  const page = getCity(city);
  if (!page) notFound();
  const live = await getLiveContent();

  // Per-city Service schema. Provider points at the LocalBusiness block the
  // root layout injects on every page (same @id), so Google links the two.
  const citySchema = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: `Mobile Car Detailing in ${page.name}, AZ`,
    serviceType: 'Mobile car detailing',
    description: page.description,
    url: `${SITE_URL}/${page.slug}`,
    provider: { '@id': `${SITE_URL}/#business` },
    areaServed: {
      '@type': 'City',
      name: page.name,
      containedInPlace: { '@type': 'State', name: 'Arizona' },
    },
  };

  return (
    <main role="main" className="homepage-cinematic relative min-h-screen overflow-hidden bg-black text-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(citySchema) }}
      />

      <SiteHeader anchorBase="/" />

      {/* Ambient gold glow at the top, same treatment as the homepage. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-0 h-[600px]"
        style={{
          background:
            'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(212, 162, 76, 0.18), transparent 70%)',
        }}
      />

      {/* Hero: city H1 + intro */}
      <section className="relative z-10 mx-auto w-full max-w-5xl px-6 pb-4 pt-16 sm:pt-20" id="main-content" tabIndex={-1}>
        <p className="text-sm font-semibold uppercase tracking-[0.4em] text-gold-400 sm:text-base">
          Quality Over Quantity
        </p>
        <h1 className="text-gradient-hero mt-3 text-4xl font-bold uppercase tracking-[0.04em] sm:text-5xl">
          {page.h1}
        </h1>
        <p className="mt-5 max-w-2xl text-lg text-gray-100 sm:text-xl">
          {page.intro}
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/auth"
            className="btn-primary press inline-block rounded-xl px-7 py-4 text-base font-semibold sm:text-lg"
          >
            Book Mobile Detailing →
          </Link>
          <a
            href="tel:+14807933782"
            className="press inline-block rounded-xl border-2 border-white/40 bg-black/40 px-7 py-4 text-base font-semibold text-white backdrop-blur hover:bg-black/60 sm:text-lg"
          >
            Call (480) 793-3782
          </a>
        </div>
      </section>

      {/* The local hook: why detailing matters in this city */}
      <section className="relative z-10 mx-auto w-full max-w-5xl px-6 py-12">
        <div className="glass-card rounded-2xl p-6 sm:p-8">
          <h2 className="h2-cinematic h-accent text-2xl font-bold uppercase tracking-wider sm:text-3xl">
            Why {page.name} Cars Need It
          </h2>
          <p className="mt-4 max-w-3xl text-base leading-relaxed text-gray-200 sm:text-lg">
            {page.hook}
          </p>
        </div>
      </section>

      {/* Owner-operated block, shared across every city page */}
      <section className="relative z-10 mx-auto w-full max-w-5xl px-6 py-12">
        <h2 className="h2-cinematic h-accent text-2xl font-bold uppercase tracking-wider sm:text-3xl">
          Owner-Operated, Every Time
        </h2>
        <p className="mt-4 max-w-3xl text-base leading-relaxed text-gray-200 sm:text-lg">
          {OWNER_LINE}
        </p>
      </section>

      {/* Services line + areas served */}
      <section className="relative z-10 mx-auto w-full max-w-5xl px-6 py-12">
        <h2 className="h2-cinematic h-accent text-2xl font-bold uppercase tracking-wider sm:text-3xl">
          What We Do in {page.name}
        </h2>
        <p className="mt-4 max-w-3xl text-base leading-relaxed text-gray-200 sm:text-lg">
          {SERVICES_LINE}{' '}
          <Link href="/#pricing" className="text-gold-300 underline-offset-4 hover:underline">
            See full pricing
          </Link>
          .
        </p>
        <p className="mt-6 max-w-3xl text-base leading-relaxed text-gray-200 sm:text-lg">
          <span className="font-semibold text-white">Where we go in {page.name}:</span>{' '}
          {page.areas}
        </p>
      </section>

      {/* Call to action */}
      <section className="relative z-10 mx-auto w-full max-w-5xl px-6 py-12 pb-16">
        <div className="glass-card rounded-2xl p-8 text-center sm:p-10">
          <h2 className="text-2xl font-bold uppercase tracking-wider text-white sm:text-3xl">
            Ready When You Are
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-base text-gray-200 sm:text-lg">
            Call or text Alex at{' '}
            <a href="tel:+14807933782" className="font-semibold text-gold-300 underline-offset-4 hover:underline">
              (480) 793-3782
            </a>
            , or book online in about a minute.
          </p>
          <div className="mt-6">
            <Link
              href="/auth"
              className="btn-primary press inline-block rounded-xl px-7 py-4 text-base font-semibold sm:text-lg"
            >
              Book Now →
            </Link>
          </div>
        </div>
      </section>

      <SiteFooter availability={live.availability} anchorBase="/" />
    </main>
  );
}
