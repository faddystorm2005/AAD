import Link from 'next/link';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { getCopy, getLiveContent } from '@/lib/cms';
import TextLines from '@/components/TextLines';
import { fetchLivePriceTable } from '@/lib/livePricing';
import { isAllowedImage } from '@/lib/cmsContent';
import Image from 'next/image';
import {
  Sparkles,
  Car,
  Sofa,
  Shield,
  MapPin,
} from 'lucide-react';
import { SERVICE_TYPES, SERVICE_TYPE_NAMES, ADD_ONS, RETURNING_CUSTOMER_DISCOUNT_RATE } from '@/lib/bookingPricing';
import SiteHeader from '@/components/home/SiteHeader';
import SiteFooter from '@/components/home/SiteFooter';
import HeroSpotlight from '@/components/home/HeroSpotlight';
import StatsStrip from '@/components/home/StatsStrip';
import StickyBookCta from '@/components/home/StickyBookCta';
import InstallAppPrompt from '@/components/home/InstallAppPrompt';
import TiltCard from '@/components/home/TiltCard';
import H2CinematicObserver from '@/components/home/H2CinematicObserver';
import ScrollCardObserver from '@/components/ScrollCardObserver';
import HeroStatCounter from '@/components/HeroStatCounter';
import HeroParallax from '@/components/home/HeroParallax';
import AmbientVideo from '@/components/home/AmbientVideo';
import Timeline from '@/components/home/Timeline';
import MobileBottomBar from '@/components/home/MobileBottomBar';
import PagePolish from '@/components/home/PagePolish';
import ServiceMapLoader from '@/components/ServiceMapLoader';
import ServiceCard from '@/components/home/ServiceCard';
import LazyVideo from '@/components/home/LazyVideo';
import { SITE_URL } from '@/lib/cityPages';

// What's-included lines per pricing tier live in siteCopy.ts
// (pricing_text.includes_*), portal-editable.

/**
 * Page title and description, editable in the portal. The layout holds the
 * same defaults for every other page; openGraph and twitter are restated in
 * full because a page-level object replaces the layout's rather than merging.
 */
export async function generateMetadata(): Promise<Metadata> {
  const copy = await getCopy();
  const title = copy.text('seo.home.title');
  const description = copy.text('seo.home.description');
  return {
    title: { absolute: title },
    description,
    openGraph: {
      type: 'website',
      siteName: 'Signature Mobile Detailing',
      title,
      description,
      url: SITE_URL + '/',
      locale: 'en_US',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  };
}

/**
 * Public marketing homepage. Server-rendered so crawlers + first-time
 * visitors see real content (services, value prop, CTAs) instead of a
 * loading splash. Logged-in visitors see the same marketing page; they
 * can navigate to their account via the "My Dashboard" link in the nav
 * (rendered by HomeNavAccountLink based on their auth state).
 */
export default async function Home() {
  const live = await getLiveContent();
  const priceTable = await fetchLivePriceTable();
  const copy = await getCopy();
  const t = copy.text;
  const heroPhoto = copy.image('hero.photo');
  const ctaPhoto = copy.image('cta.photo');
  const alex = copy.phone('contact.alex_phone');
  const kane = copy.phone('contact.kane_phone');
  const email = copy.email('contact.email');
  const services = copy.list('services.cards', ['title', 'description', 'price_note'] as const);
  const results = copy
    .list('results.items', ['photo', 'vehicle', 'service'] as const)
    // A card is the photo, so one without a usable photo is left out.
    .map((r) => ({ ...r, photo: r.photo.trim() && isAllowedImage(r.photo) ? r.photo.trim() : '' }))
    .filter((r) => r.photo);
  const steps = copy.list('how.steps', ['number', 'title', 'description'] as const);
  const reasons = copy.list('why.reasons', ['headline', 'title', 'description'] as const);
  const pillars = copy.list('value.pillars', ['title', 'description'] as const);
  const includes: Record<string, string[]> = {
    full_detail: copy.strings('pricing_text.includes_full_detail'),
    interior: copy.strings('pricing_text.includes_interior'),
    exterior: copy.strings('pricing_text.includes_exterior'),
  };
  return (
    <main role="main" className="homepage-cinematic relative min-h-screen overflow-hidden bg-black text-white">
      <link
        rel="preload"
        as="image"
        fetchPriority="high"
        href={heroPhoto}
      />

      {/* Sticky nav with keyword-rich anchor links + persistent Book CTA. */}
      <SiteHeader copy={copy} />

      {/* Ambient red glow at top + bottom */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-0 h-[600px]"
        style={{
          background:
            'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(212, 162, 76, 0.18), transparent 70%)',
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 -z-0 h-[300px]"
        style={{
          background:
            'radial-gradient(ellipse 60% 50% at 50% 100%, rgba(212, 162, 76, 0.08), transparent 70%)',
        }}
      />

      {/* Hero */}
      <section className="relative" id="main-content" tabIndex={-1}>
        {/* Phones: grow with the content (min-height, not a fixed height) so
            the headline is never clipped up behind the sticky header.
            overflow-hidden also clips the 105% banner pan sideways. */}
        <div className="relative flex min-h-[480px] w-full flex-col overflow-hidden sm:block sm:h-[60vh]">
          {/* Subtle radial color glow stands in for the old blurred-backdrop
              image. Removing the duplicate <img> saved one image fetch on
              every page load and shaved render-blocking decode work. */}
          <div aria-hidden className="hero-bg-glow pointer-events-none absolute inset-0" />
          {/* Parallax wrapper: JS moves this div at 0.38x scroll speed.
              next/Image with fill + priority + sizes lets Next.js serve
              an AVIF/WebP variant sized for the viewport, which is the
              biggest LCP win on mobile. */}
          <div className="hero-parallax-wrap">
            <Image
              src={heroPhoto}
              alt="Mobile detailing in Phoenix, AZ - professional auto detailing at your driveway"
              fill
              priority
              sizes="100vw"
              className="object-cover animate-banner-pan"
              style={{ objectPosition: 'center 55%' }}
            />
            {/* Cinemagraph of the same S-Class still: light sweeps across the
                paint. Desktop only, loads after the still, still is fallback. */}
            {/* The loop is filmed on the default photo, so a new photo from
                the portal plays without it rather than under the wrong car. */}
            {heroPhoto === copy.fallback('hero.photo') && (
              <AmbientVideo src="/images/aad/hero-s-class-loop.mp4" />
            )}
          </div>
          {/* Veil: lighter at the eyebrow line, darker toward the bottom so
              the text and CTAs always have enough contrast. */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/30 to-black" />
          {/* Vignette: subtle ellipse darkening at the corners to focus the
              eye on the headline. Sits above the veil but below the spotlight. */}
          <div aria-hidden className="hero-vignette pointer-events-none absolute inset-0" />
          {/* Soft red glow that follows the cursor for premium polish. */}
          <HeroSpotlight />
          <div className="relative mx-auto flex w-full max-w-5xl flex-1 flex-col items-start justify-end px-6 pb-12 pt-20 sm:h-full sm:pt-0">
            <p className="animate-fade-up text-sm font-semibold uppercase tracking-[0.4em] text-gold-400 sm:text-base">
              {t('hero.eyebrow')}
            </p>
            <h1
              className="hero-swipe-reveal text-gradient-hero mt-3 text-4xl font-bold uppercase tracking-[0.04em] sm:text-5xl md:text-6xl"
              style={{ animationDelay: '80ms' }}
            >
              {t('hero.heading_line1')}
              <br />
              {t('hero.heading_line2')}
            </h1>
            <p
              className="animate-fade-up mt-5 max-w-xl text-lg text-gray-100 sm:text-xl"
              style={{ animationDelay: '160ms' }}
            >
              <TextLines text={t('hero.intro')} />
            </p>
            <div
              className="animate-fade-up mt-8 flex flex-wrap gap-3"
              style={{ animationDelay: '240ms' }}
            >
              <Link
                href="/auth"
                className="btn-primary press inline-block rounded-xl px-7 py-4 text-base font-semibold sm:text-lg"
              >
                {t('hero.book_label')}
              </Link>
              <a
                href="#services"
                className="press inline-block rounded-xl border-2 border-white/40 bg-black/40 px-7 py-4 text-base font-semibold text-white backdrop-blur hover:bg-black/60 sm:text-lg"
              >
                {t('hero.explore_label')}
              </a>
            </div>
            <p
              className="animate-fade-up mt-3 text-sm text-gray-300"
              style={{ animationDelay: '320ms' }}
            >
              {t('hero.call_prompt')} <a href={alex.href} className="font-semibold text-gold-300 underline-offset-4 hover:underline">{alex.display}</a>
            </p>
          </div>
        </div>
      </section>

      {/* Stats strip - animated counters that build trust at first glance. */}
      <section
        aria-label="Stats"
        className="relative z-10 border-y border-white/5 bg-gradient-to-b from-black via-zinc-950 to-black py-10"
      >
        <div className="mx-auto w-full max-w-5xl px-6">
          <StatsStrip labels={[t('stats.label_1'), t('stats.label_2'), t('stats.label_3')]} />
        </div>
      </section>

      {/* Services */}
      <section id="services" className="relative z-10 mx-auto w-full max-w-5xl px-6 py-16 scroll-mt-20">
        <div className="reveal-on-scroll">
          <h2 className="h2-cinematic h-accent text-2xl font-bold uppercase tracking-wider sm:text-3xl">
            {t('services.heading')}
          </h2>
          <p className="mt-3 text-base text-gray-200 sm:text-lg">
            {t('services.intro_before')}{' '}
            <Link href="/auth" className="text-gold-300 underline-offset-4 hover:underline">
              {t('services.link_1')}
            </Link>
            ,{' '}
            <Link href="/auth" className="text-gold-300 underline-offset-4 hover:underline">
              {t('services.link_2')}
            </Link>
            , {t('services.intro_after')}
          </p>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((card, i) => {
            const s = serviceMeta(card.title, i);
            const liveAddon = s.addonId ? priceTable.addOns[s.addonId] : undefined;
            const priceLabel =
              liveAddon !== undefined
                ? `${card.price_note}${typeof liveAddon === 'number' ? liveAddon : liveAddon.small}`
                : card.price_note || undefined;
            return (
              <div key={i} className="scroll-card" data-stagger-i={i}>
                <ServiceCard
                  icon={s.icon}
                  title={card.title}
                  description={card.description}
                  priceLabel={priceLabel}
                  detailsLabel={t('services.details_label')}
                  hideLabel={t('services.hide_label')}
                  bookLabel={t('services.book_label')}
                />
              </div>
            );
          })}
        </div>
      </section>

      {/* Pricing - dedicated tier visibility for customers comparing
          detailers. Pulls live from bookingPricing.ts. */}
      <section id="pricing" className="relative z-10 mx-auto w-full max-w-5xl px-6 py-16 scroll-mt-20">
        <div className="reveal-on-scroll">
          <h2 className="h2-cinematic h-accent text-2xl font-bold uppercase tracking-wider sm:text-3xl">
            {t('pricing_text.heading')}
          </h2>
          <p className="mt-3 text-base text-gray-200 sm:text-lg">
            <TextLines text={t('pricing_text.intro')} />
          </p>
        </div>

        {/* Three service tier cards. Full Detail spans full width on
            sm+ screens as the headliner; Interior and Exterior fall
            beneath in a 2-col grid. SERVICE_TYPES already orders
            full_detail first so the natural flow lands correctly. */}
        <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2">
          {SERVICE_TYPES.map((type, i) => {
            const isFeatured = type === 'full_detail';
            return (
              <div
                key={type}
                className={`scroll-card relative overflow-hidden rounded-2xl p-6 transition-transform duration-500 ${
                  isFeatured
                    ? 'sm:col-span-2 border border-gold-500/50 bg-gradient-to-b from-gold-500/[0.08] via-zinc-950 to-black px-6 py-8 sm:p-10 shadow-[0_0_60px_-10px_rgba(212,162,76,0.35)]'
                    : 'glass-card lift-hover'
                }`}
                data-stagger-i={i}
              >
                {isFeatured && (
                  <span className="absolute left-1/2 top-0 -translate-x-1/2 rounded-b-lg bg-gold-600 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-black shadow-[0_4px_14px_rgba(212,162,76,0.4)]">
                    {t('pricing_text.popular_badge')}
                  </span>
                )}
                <div className={isFeatured ? 'sm:grid sm:grid-cols-2 sm:gap-10' : ''}>
                  <div>
                    <h3 className={`mt-3 font-bold uppercase tracking-wider text-white ${isFeatured ? 'text-2xl sm:text-3xl' : 'text-xl'}`}>
                      {SERVICE_TYPE_NAMES[type]}
                    </h3>
                    <ul className="mt-4 space-y-1.5">
                      {includes[type].map((item, j) => (
                        <li key={j} className="flex items-center gap-2 text-sm text-gray-300">
                          <svg className="h-3.5 w-3.5 shrink-0 text-gold-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 13l4 4L19 7" /></svg>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className={isFeatured ? 'mt-6 sm:mt-0 sm:flex sm:flex-col sm:justify-center' : ''}>
                    <div className={`space-y-3 ${isFeatured ? 'sm:border-l sm:border-gold-500/20 sm:pl-8' : 'mt-5 border-t border-white/10 pt-4'}`}>
                      <div className="flex items-center justify-between">
                        <span className="text-base text-gray-200">{t('pricing_text.size_small')}</span>
                        <span className={`font-bold text-gold-300 ${isFeatured ? 'text-2xl' : 'text-xl'}`}>${priceTable.services[type].small}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-base text-gray-200">{t('pricing_text.size_suv')}</span>
                        <span className={`font-bold text-gold-300 ${isFeatured ? 'text-2xl' : 'text-xl'}`}>${priceTable.services[type].suv}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-base text-gray-200">{t('pricing_text.size_truck')}</span>
                        <span className={`font-bold text-gold-300 ${isFeatured ? 'text-2xl' : 'text-xl'}`}>${priceTable.services[type].truck}</span>
                      </div>
                    </div>
                    <Link
                      href="/auth"
                      className={`mt-5 inline-flex text-sm font-semibold uppercase tracking-wider text-gold-300 hover:text-gold-200 ${isFeatured ? 'sm:pl-8' : ''}`}
                    >
                      {t('pricing_text.book_prefix')} {SERVICE_TYPE_NAMES[type]} →
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Add-ons section */}
        <div className="reveal-on-scroll mt-12">
          <h3 className="text-base font-semibold uppercase tracking-[0.25em] text-gold-400">
            {t('pricing_text.addons_heading')}
          </h3>
          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {ADD_ONS.map((addon) => {
              const livePrice = priceTable.addOns[addon.id];
              const priceLabel =
                typeof livePrice === 'number'
                  ? `$${livePrice}`
                  : `from $${(livePrice ?? addon.sizePrices ?? { small: addon.price }).small}`;
              return (
                <div
                  key={addon.id}
                  className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3"
                >
                  <span className="text-base text-gray-100">{addon.name}</span>
                  <span className="text-base font-semibold text-gold-300">{priceLabel}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Returning customer banner: full-width dark card with a solid
            red accent bar on the left, matching the cinematic preview. */}
        <div className="reveal-on-scroll relative mt-8 flex items-start gap-4 overflow-hidden rounded-2xl border border-white/10 bg-zinc-950/80 px-5 py-5 pl-6 sm:items-center">
          <span aria-hidden className="absolute left-0 top-0 h-full w-1 bg-gold-500" />
          <span className="mt-0.5 shrink-0 text-2xl sm:mt-0" aria-hidden>🔁</span>
          <div>
            <p className="font-semibold uppercase tracking-wider text-white">
              {t('pricing_text.returning_before')} {Math.round(RETURNING_CUSTOMER_DISCOUNT_RATE * 100)}% {t('pricing_text.returning_after')}
            </p>
            <p className="mt-1 text-sm text-gray-300">
              <TextLines text={t('pricing_text.returning_note')} />
            </p>
          </div>
        </div>
      </section>

      {/* Results showcase: specific vehicles + service labels so visitors
          can see exactly what level of finish they're paying for. The
          "recent-work" id is also where the Work nav anchor points - one
          gallery instead of two so visitors don't see the same photos
          twice. */}
      <section
        id="recent-work"
        className="relative z-10 mx-auto w-full max-w-5xl px-6 py-16 scroll-mt-20"
      >
        <div className="reveal-on-scroll">
          <h2 className="h2-cinematic h-accent text-2xl font-bold uppercase tracking-wider sm:text-3xl">
            {t('results.heading')}
          </h2>
          <p className="mt-3 text-base text-gray-200 sm:text-lg">
            <TextLines text={t('results.intro')} />
          </p>
        </div>
        <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {results.map(({ photo: src, vehicle, service }, i) => (
            <div
              key={i}
              className="reveal-on-scroll group relative overflow-hidden rounded-2xl border border-white/10 bg-gray-900"
              data-stagger-i={i}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={src}
                alt={`${[vehicle, service].filter(Boolean).join(', ') || 'Detail'} by Signature Mobile Detailing`}
                loading="lazy"
                className="aspect-square w-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
              {(vehicle || service) && (
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-3">
                  {vehicle && <p className="text-xs font-semibold text-white">{vehicle}</p>}
                  {service && <p className="text-xs text-gold-300">{service}</p>}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>


      {/* TikTok callout - full card that demands attention, not just a link. */}
      <section
        aria-label="TikTok content"
        className="relative z-10 mx-auto w-full max-w-5xl px-6 py-8"
      >
        <div className="reveal-on-scroll">
          <a
            href="https://www.tiktok.com/@signaturedetailingco"
            target="_blank"
            rel="noopener noreferrer"
            className="lift-hover group relative flex flex-col overflow-hidden rounded-3xl border border-white/10 sm:flex-row"
            aria-label="Follow Signature Mobile Detailing on TikTok - watch before and afters"
          >
            {/* Ambient glow + base background */}
            <div aria-hidden className="tiktok-card-bg pointer-events-none absolute inset-0" />
            {/* TikTok preview video panel - shows the actual content. The
                small TikTok glyph overlays the bottom-right corner so the
                card still reads as "TikTok" at a glance. */}
            <div className="relative flex shrink-0 items-center justify-center border-b border-white/5 bg-black/40 p-4 sm:border-b-0 sm:border-r sm:border-white/5 sm:p-6">
              <div className="relative aspect-[9/16] w-40 overflow-hidden rounded-2xl ring-1 ring-white/10 transition-all duration-500 group-hover:ring-gold-500/60 group-hover:shadow-[0_0_28px_rgba(212,162,76,0.4)] sm:w-44">
                <LazyVideo
                  src="/images/aad/tiktok-mercedes.mp4"
                  poster="/images/aad/posters/tiktok-mercedes.jpg"
                  ariaLabel="Mercedes detail TikTok preview"
                  tapToPlay={false}
                  className="absolute inset-0 h-full w-full object-cover"
                />
                {/* TikTok glyph badge overlay */}
                <div className="pointer-events-none absolute bottom-2 right-2 flex h-8 w-8 items-center justify-center rounded-lg bg-black/70 ring-1 ring-white/20 backdrop-blur-sm">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className="h-4 w-4 text-white"
                    aria-hidden="true"
                  >
                    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5.8 20.1a6.34 6.34 0 0 0 10.86-4.43V8.2a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1.84-.63z" />
                  </svg>
                </div>
              </div>
            </div>
            {/* Content panel */}
            <div className="relative flex flex-1 flex-col justify-center p-8 sm:p-10">
              <p className="text-xs font-semibold uppercase tracking-[0.4em] text-gold-500">
                {t('tiktok.eyebrow')}
              </p>
              <h2 className="mt-2 text-2xl font-bold uppercase tracking-wider text-white sm:text-3xl">
                {t('tiktok.heading')}
              </h2>
              <p className="mt-3 max-w-lg text-base leading-relaxed text-gray-300">
                <TextLines text={t('tiktok.text')} />
              </p>
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <span className="inline-flex items-center gap-2 rounded-xl bg-gold-600 px-5 py-2.5 text-sm font-semibold text-black transition-colors duration-200 group-hover:bg-gold-500">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className="h-4 w-4 shrink-0"
                    aria-hidden="true"
                  >
                    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5.8 20.1a6.34 6.34 0 0 0 10.86-4.43V8.2a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1.84-.63z" />
                  </svg>
                  {t('tiktok.button')}
                </span>
                <span className="text-sm text-gray-300">{t('tiktok.note')}</span>
              </div>
            </div>
          </a>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="relative z-10 mx-auto w-full max-w-5xl px-6 py-16 scroll-mt-20">
        <div className="reveal-on-scroll">
          <h2 className="h2-cinematic h-accent text-2xl font-bold uppercase tracking-wider sm:text-3xl">
            {t('how.heading')}
          </h2>
          <p className="mt-3 text-base text-gray-200 sm:text-lg">
            <TextLines text={t('how.intro')} />
          </p>
        </div>
        <div className="mt-12">
          <Timeline steps={steps} moreLabel={t('how.more_label')} hideLabel={t('how.hide_label')} />
        </div>
      </section>

      {/* Why us */}
      <section className="relative z-10 mx-auto w-full max-w-5xl px-6 py-16">
        <div className="reveal-on-scroll">
          <h2 className="h2-cinematic h-accent text-2xl font-bold uppercase tracking-wider sm:text-3xl">
            {t('why.heading')}
          </h2>
        </div>
        <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-3">
          {reasons.map((r, i) => (
            <div
              key={i}
              className="glass-card scroll-card rounded-2xl p-6"
              data-stagger-i={i}
            >
              {r.headline && <p className="text-2xl font-bold text-gold-400 sm:text-3xl">{r.headline}</p>}
              {r.title && <h3 className="mt-3 text-lg font-bold text-white">{r.title}</h3>}
              {r.description && <p className="mt-2 text-base text-gray-200"><TextLines text={r.description} /></p>}
            </div>
          ))}
        </div>
      </section>

      {/* The Real Value - one hero stat + three trust pillars. Concrete proof
          that bridges the marketing tiles above and the emotional Mission
          quote below. Lead with time saved because it's the one thing brick-
          and-mortar shops literally cannot match. */}
      <section
        aria-label="The real value"
        className="relative z-10 mx-auto w-full max-w-5xl px-6 py-16"
      >
        <div className="reveal-on-scroll text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.4em] text-gold-500">
            {t('value.eyebrow')}
          </p>
          <h2 className="mt-3 text-2xl font-bold uppercase tracking-wider text-white sm:text-3xl">
            {t('value.heading')}
          </h2>
        </div>

        {/* Hero stat */}
        <div className="reveal-on-scroll mt-10 flex flex-col items-center text-center">
          <p className="text-6xl font-bold sm:text-7xl">
            <HeroStatCounter />
          </p>
          <p className="mt-2 text-sm uppercase tracking-[0.25em] text-gray-300">
            {t('value.stat_label')}
          </p>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-gray-300">
            <TextLines text={t('value.text')} />
          </p>
        </div>

        {/* Trust pillars - 3D mouse-tilt on hover via TiltCard. */}
        <div className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-3">
          {pillars.map((p, i) => (
            <div key={i} className="scroll-card" data-stagger-i={i}>
            <TiltCard className="glass-card rounded-2xl p-6 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-gold-500/40 bg-gold-500/10 text-2xl">
                {pillarIcon(p.title, i)}
              </div>
              {p.title && (
                <h3 className="mt-4 text-lg font-bold text-white">
                  {p.title}
                </h3>
              )}
              {p.description && <p className="mt-2 text-base text-gray-200"><TextLines text={p.description} /></p>}
            </TiltCard>
            </div>
          ))}
        </div>
      </section>

      {/* Our Mission - emotional anchor between the card grids and the FAQ.
          Pull-quote layout so it reads as a statement of intent, not another
          marketing tile. */}
      <section
        aria-label="Our mission"
        className="relative z-10 border-y border-white/5 bg-gradient-to-b from-black via-zinc-950 to-black py-20"
      >
        {/* Subtle cross watermark - aria-hidden so screen readers skip it */}
        <div aria-hidden className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden">
          <svg
            viewBox="0 0 100 100"
            className="h-64 w-64 opacity-[0.03] sm:h-80 sm:w-80"
            fill="white"
          >
            <rect x="42" y="5" width="16" height="90" rx="3" />
            <rect x="5" y="32" width="90" height="16" rx="3" />
          </svg>
        </div>
        <div className="relative mx-auto w-full max-w-3xl px-6 text-center">
          <p className="reveal-on-scroll text-xs font-semibold uppercase tracking-[0.4em] text-gold-500">
            {t('mission.eyebrow')}
          </p>
          <blockquote
            className="reveal-on-scroll mt-6 text-balance text-2xl font-semibold leading-snug text-white sm:text-3xl"
          >
            <span className="text-gradient-hero">
              &ldquo;{t('mission.quote')}&rdquo;
            </span>
          </blockquote>
          <p className="reveal-on-scroll mt-6 text-base leading-relaxed text-gray-300">
            <TextLines text={t('mission.text')} />
          </p>
          {/* Both names, because they own it fifty-fifty and the paragraph
              above is written as "we". Attributing it to one of them made the
              other invisible on the only part of the page that says who you
              are actually hiring. */}
          <p className="reveal-on-scroll mt-6 text-sm uppercase tracking-[0.3em] text-gray-300">
            {t('mission.owners')}
          </p>
          <p className="reveal-on-scroll mt-4 text-sm italic text-gray-300">
            &ldquo;{t('mission.verse')}&rdquo; &middot; {t('mission.verse_ref')}
          </p>
        </div>
      </section>

      {/* FAQ - adds keyword-rich content + answers common pre-booking questions */}
      <section id="faq" className="relative z-10 mx-auto w-full max-w-3xl px-6 py-16 scroll-mt-20">
        <div className="reveal-on-scroll text-center">
          <h2 className="h2-cinematic h-accent inline-block text-2xl font-bold uppercase tracking-wider sm:text-3xl">
            {t('faq.heading')}
          </h2>
        </div>
        <div className="mt-10 space-y-4">
          {live.faqs.map((q, i) => (
            <details
              key={i}
              className="glass-card scroll-card group rounded-2xl p-5"
              data-stagger-i={i}
            >
              <summary className="flex cursor-pointer list-none items-start justify-between gap-3 text-lg font-semibold text-white">
                <span>{q.question}</span>
                <span className="text-2xl text-gold-400 transition-transform group-open:rotate-45">+</span>
              </summary>
              {q.answer && <p className="mt-3 text-base leading-relaxed text-gray-200"><TextLines text={q.answer} /></p>}
            </details>
          ))}
        </div>
        <p className="mt-8 text-center text-base text-gray-200">
          {t('faq.footer_before')}{' '}
          <a href="#contact" className="text-gold-300 underline-offset-4 hover:underline">
            {t('faq.contact_link')}
          </a>{' '}
          or{' '}
          <Link href="/auth" className="text-gold-300 underline-offset-4 hover:underline">
            {t('faq.book_link')}
          </Link>{' '}
          {t('faq.footer_after')}
        </p>
      </section>

      {/* Watch Us Work - lazy-loaded so the videos don't stall first paint.
          Each <video> stays src-less until LazyVideo's IntersectionObserver
          fires when this section scrolls into view. Real AAD footage only:
          the garage and the van, side by side on desktop, stacked on mobile. */}
      <section className="relative z-10 mx-auto w-full max-w-5xl px-6 py-16">
        <div className="reveal-on-scroll text-center">
          <h2 className="h2-cinematic h-accent inline-block text-2xl font-bold uppercase tracking-wider sm:text-3xl">
            {t('watch.heading')}
          </h2>
          <p className="mt-3 text-base text-gray-200 sm:text-lg">
            <TextLines text={t('watch.intro')} />
          </p>
        </div>
        <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="relative aspect-video w-full overflow-hidden rounded-2xl border border-white/10 bg-zinc-900">
            <LazyVideo
              src="/images/aad/garage.mp4"
              poster="/images/aad/posters/garage.jpg"
              ariaLabel="Signature Mobile Detailing garage"
              className="absolute inset-0 h-full w-full object-cover"
            />
          </div>
          <div className="relative aspect-video w-full overflow-hidden rounded-2xl border border-white/10 bg-zinc-900">
            <LazyVideo
              src="/images/aad/van.mp4"
              poster="/images/aad/posters/van.jpg"
              ariaLabel="Signature Mobile Detailing mobile detailing van"
              className="absolute inset-0 h-full w-full object-cover"
            />
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="relative z-10 mx-auto w-full max-w-5xl px-6 pb-16">
        <div className="lift-hover relative overflow-hidden rounded-3xl border border-white/10 reveal-on-scroll">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={ctaPhoto}
            alt="Book mobile detailing in Phoenix, AZ - on-site car detailing at your home or office"
            width={1920}
            height={1080}
            loading="lazy"
            decoding="async"
            className="absolute inset-0 h-full w-full object-cover animate-banner-pan"
          />
          {/* Foam pre-wash cinemagraph from our own photo; still is fallback. */}
          {ctaPhoto === copy.fallback('cta.photo') && (
            <AmbientVideo src="/images/aad/foam-loop.mp4" />
          )}
          <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/65 to-black/30" />
          <div className="relative flex flex-col items-start gap-4 p-10 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.35em] text-gold-400">
                {t('cta.eyebrow')}
              </p>
              <h3 className="mt-2 text-2xl font-bold text-white sm:text-3xl">
                {t('cta.heading')}
              </h3>
              <p className="mt-2 max-w-xl text-base text-gray-100 sm:text-lg">
                <TextLines text={t('cta.text')} />
              </p>
            </div>
            <Link
              href="/auth"
              className="btn-primary press inline-block shrink-0 rounded-xl px-7 py-4 text-base font-semibold sm:text-lg"
            >
              {t('cta.button')}
            </Link>
          </div>
        </div>
      </section>

      {/* Contact */}
      <section id="contact" className="relative z-10 mx-auto w-full max-w-5xl px-6 pb-16 scroll-mt-20">
        <div className="reveal-on-scroll">
          <h2 className="h2-cinematic h-accent text-2xl font-bold uppercase tracking-wider sm:text-3xl">
            {t('contact.heading')}
          </h2>
          <p className="mt-3 text-base text-gray-200 sm:text-lg">
            {t('contact.lead')} Call or text {t('contact.alex_name')} at{' '}
            <a href={alex.href} className="font-semibold text-gold-300 underline-offset-4 hover:underline">
              {alex.display}
            </a>
            {' '}or {t('contact.kane_name')} at{' '}
            <a href={kane.href} className="font-semibold text-gold-300 underline-offset-4 hover:underline">
              {kane.display}
            </a>
            , email{' '}
            <a href={email.href} className="font-semibold text-gold-300 underline-offset-4 hover:underline">
              {email.display}
            </a>
            , or{' '}
            <Link href="/auth" className="text-gold-300 underline-offset-4 hover:underline">
              {t('contact.book_link')}
            </Link>
            . {t('contact.closing')}
          </p>
          <p className="mt-3 text-sm font-semibold uppercase tracking-wider text-gold-300">
            {live.availability}
          </p>
          <div className="mt-6">
            <p className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-300">
              {t('contact.map_label')}
            </p>
            <ServiceMapLoader />
          </div>
        </div>
      </section>

      {/* Footer */}
      <SiteFooter availability={live.availability} copy={copy} />

      <H2CinematicObserver />
      <ScrollCardObserver />
      <HeroParallax />
      {/* Floating "Book Now" pill that fades in once visitor scrolls past hero. */}
      <StickyBookCta label={t('buttons.sticky_book')} />
      <InstallAppPrompt />
      <MobileBottomBar callHref={alex.href} callLabel={t('buttons.bar_call')} bookLabel={t('buttons.bar_book')} />
      <PagePolish />
    </main>
  );
}

// Service icon size standardized at 24px so they sit consistently inside
// the red-accented circular badge in ServiceCard.
const ICON_SIZE = 24;

// Icons stay in code; the words come from siteCopy.ts (services.cards).
// A card keeps the icon of the built-in card with the same title, so a
// reordered list moves the icon with it. New cards take icons by position.
type ServiceMeta = {
  icon: ReactNode;
  // When set, the trailing price on the price note comes from the live
  // portal-managed price table so the card can never disagree with
  // the pricing section below it.
  addonId?: string;
};

const SERVICE_META: { title: string; meta: ServiceMeta }[] = [
  { title: 'Full Detail', meta: { icon: <Sparkles size={ICON_SIZE} aria-hidden /> } },
  { title: 'Exterior Detailing', meta: { icon: <Car size={ICON_SIZE} aria-hidden /> } },
  { title: 'Interior Detailing', meta: { icon: <Sofa size={ICON_SIZE} aria-hidden /> } },
  { title: 'Ceramic Coating', meta: { icon: <Shield size={ICON_SIZE} aria-hidden /> } },
  { title: 'Mobile - We Come To You', meta: { icon: <MapPin size={ICON_SIZE} aria-hidden /> } },
];

function serviceMeta(title: string, i: number): ServiceMeta {
  return (
    SERVICE_META.find((m) => m.title === title)?.meta ??
    SERVICE_META[i % SERVICE_META.length].meta
  );
}

// Same rule for the three trust pillars (value.pillars). Each one answers
// a quiet objection: "is this guy reliable?", "what if it sucks?",
// "what's the catch?".
const PILLAR_ICONS: { title: string; icon: string }[] = [
  { title: 'Owner-Operated', icon: '👤' },
  { title: 'Showroom-Ready, Guaranteed', icon: '✅' },
  { title: 'Nothing to Pay Up Front', icon: '🔒' },
];

function pillarIcon(title: string, i: number): string {
  return (
    PILLAR_ICONS.find((p) => p.title === title)?.icon ??
    PILLAR_ICONS[i % PILLAR_ICONS.length].icon
  );
}

// FAQ content lives in lib/cms.ts (portal-editable with baked-in defaults).

