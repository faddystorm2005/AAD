import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getCopy, getLiveContent } from '@/lib/cms';
import TextLines from '@/components/TextLines';
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
  // Title and description are portal-editable per city, defaulting to CITIES.
  const copy = await getCopy();
  const title = copy.text(`cities.${page.slug}.seo_title`);
  const description = copy.text(`cities.${page.slug}.seo_description`);
  return {
    title,
    description,
    // The root layout sets canonical "/" for the homepage. Every city page
    // must claim its own path or all five would point Google at the homepage.
    alternates: { canonical: `/${page.slug}` },
    openGraph: {
      title,
      description,
      url: `${SITE_URL}/${page.slug}`,
    },
    twitter: {
      title,
      description,
    },
  };
}

// Copy shared by every city page lives once in siteCopy.ts (city.*) so the
// five pages can never drift apart. The per-city voice lives in the CITIES
// map and is portal-editable as cities.<slug>.*.

export default async function CityPage({
  params,
}: {
  params: Promise<{ city: string }>;
}) {
  const { city } = await params;
  const page = getCity(city);
  if (!page) notFound();
  const live = await getLiveContent();
  const copy = await getCopy();
  const t = copy.text;
  const c = (field: string) => t(`cities.${page.slug}.${field}`);
  const alex = copy.phone('contact.alex_phone');
  const description = c('seo_description');

  // Per-city Service schema. Provider points at the LocalBusiness block the
  // root layout injects on every page (same @id), so Google links the two.
  const citySchema = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: `Mobile Car Detailing in ${page.name}, AZ`,
    serviceType: 'Mobile car detailing',
    description,
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

      <SiteHeader anchorBase="/" copy={copy} />

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
          {t('city.eyebrow')}
        </p>
        <h1 className="text-gradient-hero mt-3 text-4xl font-bold uppercase tracking-[0.04em] sm:text-5xl">
          {c('h1')}
        </h1>
        <p className="mt-5 max-w-2xl text-lg text-gray-100 sm:text-xl">
          <TextLines text={c('intro')} />
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/auth"
            className="btn-primary press inline-block rounded-xl px-7 py-4 text-base font-semibold sm:text-lg"
          >
            {t('city.book_label')}
          </Link>
          <a
            href={alex.href}
            className="press inline-block rounded-xl border-2 border-white/40 bg-black/40 px-7 py-4 text-base font-semibold text-white backdrop-blur hover:bg-black/60 sm:text-lg"
          >
            {t('city.call_prefix')} {alex.display}
          </a>
        </div>
      </section>

      {/* The local hook: why detailing matters in this city */}
      <section className="relative z-10 mx-auto w-full max-w-5xl px-6 py-12">
        <div className="glass-card rounded-2xl p-6 sm:p-8">
          <h2 className="h2-cinematic h-accent text-2xl font-bold uppercase tracking-wider sm:text-3xl">
            {c('hook_heading')}
          </h2>
          <p className="mt-4 max-w-3xl text-base leading-relaxed text-gray-200 sm:text-lg">
            <TextLines text={c('hook')} />
          </p>
        </div>
      </section>

      {/* Owner-operated block, shared across every city page */}
      <section className="relative z-10 mx-auto w-full max-w-5xl px-6 py-12">
        <h2 className="h2-cinematic h-accent text-2xl font-bold uppercase tracking-wider sm:text-3xl">
          {t('city.owner_heading')}
        </h2>
        <p className="mt-4 max-w-3xl text-base leading-relaxed text-gray-200 sm:text-lg">
          <TextLines text={t('city.owner_text')} />
        </p>
      </section>

      {/* Services line + areas served */}
      <section className="relative z-10 mx-auto w-full max-w-5xl px-6 py-12">
        <h2 className="h2-cinematic h-accent text-2xl font-bold uppercase tracking-wider sm:text-3xl">
          {c('services_heading')}
        </h2>
        <p className="mt-4 max-w-3xl text-base leading-relaxed text-gray-200 sm:text-lg">
          {t('city.services_text')}{' '}
          <Link href="/#pricing" className="text-gold-300 underline-offset-4 hover:underline">
            {t('city.pricing_link')}
          </Link>
          .
        </p>
        <p className="mt-6 max-w-3xl text-base leading-relaxed text-gray-200 sm:text-lg">
          <span className="font-semibold text-white">{c('areas_label')}</span>{' '}
          {c('areas')}
        </p>
      </section>

      {/* Call to action */}
      <section className="relative z-10 mx-auto w-full max-w-5xl px-6 py-12 pb-16">
        <div className="glass-card rounded-2xl p-8 text-center sm:p-10">
          <h2 className="text-2xl font-bold uppercase tracking-wider text-white sm:text-3xl">
            {t('city.cta_heading')}
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-base text-gray-200 sm:text-lg">
            {t('city.cta_before')}{' '}
            <a href={alex.href} className="font-semibold text-gold-300 underline-offset-4 hover:underline">
              {alex.display}
            </a>
            , {t('city.cta_after')}
          </p>
          <div className="mt-6">
            <Link
              href="/auth"
              className="btn-primary press inline-block rounded-xl px-7 py-4 text-base font-semibold sm:text-lg"
            >
              {t('city.cta_button')}
            </Link>
          </div>
        </div>
      </section>

      <SiteFooter availability={live.availability} anchorBase="/" copy={copy} />
    </main>
  );
}
