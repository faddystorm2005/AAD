import Link from 'next/link';
import type { ReactNode } from 'react';
import { getLiveContent } from '@/lib/cms';
import { fetchLivePriceTable } from '@/lib/livePricing';
import Image from 'next/image';
import {
  Sparkles,
  Car,
  Sofa,
  Shield,
  MapPin,
} from 'lucide-react';
import { SERVICE_TYPES, SERVICE_TYPE_NAMES, ADD_ONS, RETURNING_CUSTOMER_DISCOUNT_RATE } from '@/lib/bookingPricing';
import { DASHBOARD_BANNER, BOOK_CTA_IMAGE } from '@/lib/siteImages';
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

const SERVICE_INCLUDES: Record<string, string[]> = {
  exterior: [
    'Hand wash & dry',
    'Clay bar treatment',
    'Wheel & tire cleaning',
    'Exterior windows',
    'Tire dressing & shine',
  ],
  interior: [
    'Full vacuum: seats, floor, trunk',
    'Dashboard & console detail',
    'Door panels & pockets',
    'Interior windows',
    'Floor mat cleaning',
  ],
  full_detail: [
    'Complete exterior detail',
    'Complete interior detail',
    'Door jamb cleaning',
    'Biggest transformation, best value',
  ],
};

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
  return (
    <main role="main" className="homepage-cinematic relative min-h-screen overflow-hidden bg-black text-white">
      <link
        rel="preload"
        as="image"
        fetchPriority="high"
        href="/images/aad/hero-s-class.jpg"
      />

      {/* Sticky nav with keyword-rich anchor links + persistent Book CTA. */}
      <SiteHeader />

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
        <div className="relative h-[60vh] min-h-[480px] w-full overflow-hidden">
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
              src={DASHBOARD_BANNER.src}
              alt="Mobile detailing in Phoenix, AZ - professional auto detailing at your driveway"
              fill
              priority
              sizes="100vw"
              className="object-cover animate-banner-pan"
              style={{ objectPosition: 'center 55%' }}
            />
            {/* Cinemagraph of the same S-Class still: light sweeps across the
                paint. Desktop only, loads after the still, still is fallback. */}
            <AmbientVideo src="/images/aad/hero-s-class-loop.mp4" />
          </div>
          {/* Veil: lighter at the eyebrow line, darker toward the bottom so
              the text and CTAs always have enough contrast. */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/30 to-black" />
          {/* Vignette: subtle ellipse darkening at the corners to focus the
              eye on the headline. Sits above the veil but below the spotlight. */}
          <div aria-hidden className="hero-vignette pointer-events-none absolute inset-0" />
          {/* Soft red glow that follows the cursor for premium polish. */}
          <HeroSpotlight />
          <div className="relative mx-auto flex h-full w-full max-w-5xl flex-col items-start justify-end px-6 pb-12">
            <p className="animate-fade-up text-sm font-semibold uppercase tracking-[0.4em] text-gold-400 sm:text-base">
              Quality Over Quantity
            </p>
            <h1
              className="hero-swipe-reveal text-gradient-hero mt-3 text-4xl font-bold uppercase tracking-[0.04em] sm:text-5xl md:text-6xl"
              style={{ animationDelay: '80ms' }}
            >
              Mobile Detailing
              <br />
              in Phoenix
            </h1>
            <p
              className="animate-fade-up mt-5 max-w-xl text-lg text-gray-100 sm:text-xl"
              style={{ animationDelay: '160ms' }}
            >
              Professional detailing brought right to your driveway, office, or garage across Phoenix, Scottsdale, Tempe, Mesa, Chandler, and Gilbert. We bring everything we need. You don&apos;t lift a finger.
            </p>
            <div
              className="animate-fade-up mt-8 flex flex-wrap gap-3"
              style={{ animationDelay: '240ms' }}
            >
              <Link
                href="/auth"
                className="btn-primary press inline-block rounded-xl px-7 py-4 text-base font-semibold sm:text-lg"
              >
                Book Mobile Detailing →
              </Link>
              <a
                href="#services"
                className="press inline-block rounded-xl border-2 border-white/40 bg-black/40 px-7 py-4 text-base font-semibold text-white backdrop-blur hover:bg-black/60 sm:text-lg"
              >
                Explore Services
              </a>
            </div>
            <p
              className="animate-fade-up mt-3 text-sm text-gray-300"
              style={{ animationDelay: '320ms' }}
            >
              Prefer to call? <a href="tel:+14807933782" className="font-semibold text-gold-300 underline-offset-4 hover:underline">(480) 793-3782</a>
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
          <StatsStrip />
        </div>
      </section>

      {/* Services */}
      <section id="services" className="relative z-10 mx-auto w-full max-w-5xl px-6 py-16 scroll-mt-20">
        <div className="reveal-on-scroll">
          <h2 className="h2-cinematic h-accent text-2xl font-bold uppercase tracking-wider sm:text-3xl">
            Our Mobile Detailing Services
          </h2>
          <p className="mt-3 text-base text-gray-200 sm:text-lg">
            Every package is tailored to your vehicle. We come to you for{' '}
            <Link href="/auth" className="text-gold-300 underline-offset-4 hover:underline">
              Phoenix car detailing
            </Link>
            ,{' '}
            <Link href="/auth" className="text-gold-300 underline-offset-4 hover:underline">
              auto detailing services
            </Link>
            , and ceramic coatings. No driving across town, no waiting rooms.
          </p>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {SERVICES.map((s, i) => {
            const liveAddon = s.addonId ? priceTable.addOns[s.addonId] : undefined;
            const priceLabel =
              liveAddon !== undefined
                ? `${s.priceLabel}${typeof liveAddon === 'number' ? liveAddon : liveAddon.small}`
                : s.priceLabel || undefined;
            return (
              <div key={s.title} className="scroll-card" data-stagger-i={i}>
                <ServiceCard
                  icon={s.icon}
                  title={live.services[i]?.title || s.title}
                  description={live.services[i]?.description || s.description}
                  priceLabel={priceLabel}
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
            Pricing
          </h2>
          <p className="mt-3 text-base text-gray-200 sm:text-lg">
            Flat rates by vehicle size. Travel included, no surprise fees. Nothing to pay up front, you pay on-site once the work is done.
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
                    Most Popular
                  </span>
                )}
                <div className={isFeatured ? 'sm:grid sm:grid-cols-2 sm:gap-10' : ''}>
                  <div>
                    <h3 className={`mt-3 font-bold uppercase tracking-wider text-white ${isFeatured ? 'text-2xl sm:text-3xl' : 'text-xl'}`}>
                      {SERVICE_TYPE_NAMES[type]}
                    </h3>
                    <ul className="mt-4 space-y-1.5">
                      {SERVICE_INCLUDES[type].map((item) => (
                        <li key={item} className="flex items-center gap-2 text-sm text-gray-300">
                          <svg className="h-3.5 w-3.5 shrink-0 text-gold-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 13l4 4L19 7" /></svg>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className={isFeatured ? 'mt-6 sm:mt-0 sm:flex sm:flex-col sm:justify-center' : ''}>
                    <div className={`space-y-3 ${isFeatured ? 'sm:border-l sm:border-gold-500/20 sm:pl-8' : 'mt-5 border-t border-white/10 pt-4'}`}>
                      <div className="flex items-center justify-between">
                        <span className="text-base text-gray-200">Coupe / Sedan</span>
                        <span className={`font-bold text-gold-300 ${isFeatured ? 'text-2xl' : 'text-xl'}`}>${priceTable.services[type].small}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-base text-gray-200">SUV</span>
                        <span className={`font-bold text-gold-300 ${isFeatured ? 'text-2xl' : 'text-xl'}`}>${priceTable.services[type].suv}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-base text-gray-200">Truck / 3-Row</span>
                        <span className={`font-bold text-gold-300 ${isFeatured ? 'text-2xl' : 'text-xl'}`}>${priceTable.services[type].truck}</span>
                      </div>
                    </div>
                    <Link
                      href="/auth"
                      className={`mt-5 inline-flex text-sm font-semibold uppercase tracking-wider text-gold-300 hover:text-gold-200 ${isFeatured ? 'sm:pl-8' : ''}`}
                    >
                      Book {SERVICE_TYPE_NAMES[type]} →
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
            Add-On Services
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
              Returning customer? {Math.round(RETURNING_CUSTOMER_DISCOUNT_RATE * 100)}% off, no code needed.
            </p>
            <p className="mt-1 text-sm text-gray-300">
              The discount is applied automatically at checkout. Final quote may adjust for vehicle condition.
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
            The Results
          </h2>
          <p className="mt-3 text-base text-gray-200 sm:text-lg">
            Real vehicles, real finishes. This is the standard every detail is held to.
          </p>
        </div>
        <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {[
            { src: '/images/aad/gallery-ford-super-duty.jpg', vehicle: 'Ford Super Duty', service: 'Full Interior Detail' },
            { src: '/images/aad/gallery-mercedes-gle-interior.jpg', vehicle: 'Mercedes GLE', service: 'Interior Deep Clean' },
            { src: '/images/aad/gallery-audi-s4-red-leather.jpg', vehicle: 'Audi S4', service: 'Leather Conditioning' },
            { src: '/images/aad/gallery-toyota-tundra-console.jpg', vehicle: 'Toyota Tundra', service: 'Interior Detail' },
            { src: '/images/aad/gallery-nissan-rogue-interior.jpg', vehicle: 'Nissan Rogue', service: 'Interior Detail' },
            { src: '/images/aad/gallery-bmw-engine-bay.jpg', vehicle: 'BMW', service: 'Engine Bay Detail' },
            { src: '/images/aad/gallery-suv-cargo-area.jpg', vehicle: 'SUV', service: 'Cargo Area Clean' },
            { src: '/images/aad/gallery-ford-king-ranch.jpg', vehicle: 'Ford King Ranch', service: 'Full Detail' },
          ].map(({ src, vehicle, service }, i) => (
            <div
              key={src}
              className="reveal-on-scroll group relative overflow-hidden rounded-2xl border border-white/10 bg-gray-900"
              data-stagger-i={i}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={src}
                alt={`${vehicle}, ${service} by Signature Mobile Detailing`}
                loading="lazy"
                className="aspect-square w-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-3">
                <p className="text-xs font-semibold text-white">{vehicle}</p>
                <p className="text-xs text-gold-300">{service}</p>
              </div>
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
                Behind the Scenes
              </p>
              <h2 className="mt-2 text-2xl font-bold uppercase tracking-wider text-white sm:text-3xl">
                Watch Every Detail Live
              </h2>
              <p className="mt-3 max-w-lg text-base leading-relaxed text-gray-300">
                Before and afters. Deep-clean transformations. The
                satisfying moments most customers never see. Real cars,
                real Phoenix drivers. Follow along and see what
                yours could look like.
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
                  Follow @signaturedetailingco →
                </span>
                <span className="text-sm text-gray-300">Free to watch &amp; follow</span>
              </div>
            </div>
          </a>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="relative z-10 mx-auto w-full max-w-5xl px-6 py-16 scroll-mt-20">
        <div className="reveal-on-scroll">
          <h2 className="h2-cinematic h-accent text-2xl font-bold uppercase tracking-wider sm:text-3xl">
            How It Works
          </h2>
          <p className="mt-3 text-base text-gray-200 sm:text-lg">
            Booking mobile detailing in Phoenix takes about a minute. Here&apos;s how it goes:
          </p>
        </div>
        <div className="mt-12">
          <Timeline />
        </div>
      </section>

      {/* Why us */}
      <section className="relative z-10 mx-auto w-full max-w-5xl px-6 py-16">
        <div className="reveal-on-scroll">
          <h2 className="h2-cinematic h-accent text-2xl font-bold uppercase tracking-wider sm:text-3xl">
            Why Signature Mobile Detailing
          </h2>
        </div>
        <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-3">
          {REASONS.map((r, i) => (
            <div
              key={r.title}
              className="glass-card scroll-card rounded-2xl p-6"
              data-stagger-i={i}
            >
              <p className="text-2xl font-bold text-gold-400 sm:text-3xl">{r.headline}</p>
              <h3 className="mt-3 text-lg font-bold text-white">{r.title}</h3>
              <p className="mt-2 text-base text-gray-200">{r.description}</p>
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
            The Real Value
          </p>
          <h2 className="mt-3 text-2xl font-bold uppercase tracking-wider text-white sm:text-3xl">
            Get Your Saturday Back
          </h2>
        </div>

        {/* Hero stat */}
        <div className="reveal-on-scroll mt-10 flex flex-col items-center text-center">
          <p className="text-6xl font-bold sm:text-7xl">
            <HeroStatCounter />
          </p>
          <p className="mt-2 text-sm uppercase tracking-[0.25em] text-gray-300">
            saved per detail
          </p>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-gray-300">
            No drop-off. No shop waiting room. No pickup. No Uber both ways.
            We work in your driveway while you keep your day.
          </p>
        </div>

        {/* Trust pillars - 3D mouse-tilt on hover via TiltCard. */}
        <div className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-3">
          {TRUST_PILLARS.map((p, i) => (
            <div key={p.title} className="scroll-card" data-stagger-i={i}>
            <TiltCard className="glass-card rounded-2xl p-6 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-gold-500/40 bg-gold-500/10 text-2xl">
                {p.icon}
              </div>
              <h3 className="mt-4 text-lg font-bold text-white">
                {p.title}
              </h3>
              <p className="mt-2 text-base text-gray-200">{p.description}</p>
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
            Our Mission
          </p>
          <blockquote
            className="reveal-on-scroll mt-6 text-balance text-2xl font-semibold leading-snug text-white sm:text-3xl"
          >
            <span className="text-gradient-hero">
              &ldquo;Keep every car looking brand new. The one you drive
              home in should feel like the one you drove off the lot.&rdquo;
            </span>
          </blockquote>
          <p className="reveal-on-scroll mt-6 text-base leading-relaxed text-gray-300">
            We treat every vehicle like it&apos;s our own. That&apos;s why we
            cap at six details a day, bring everything to your door, and
            don&apos;t cut a single corner. Cars take you to the people and
            places that matter, so they should look the part.
          </p>
          {/* Both names, because they own it fifty-fifty and the paragraph
              above is written as "we". Attributing it to one of them made the
              other invisible on the only part of the page that says who you
              are actually hiring. */}
          <p className="reveal-on-scroll mt-6 text-sm uppercase tracking-[0.3em] text-gray-300">
            Alex Browning &amp; Kane Pexa, Owners
          </p>
          <p className="reveal-on-scroll mt-4 text-sm italic text-gray-300">
            &ldquo;Commit your work to the Lord, and your plans will be established.&rdquo; &middot; Prov. 16:3
          </p>
        </div>
      </section>

      {/* FAQ - adds keyword-rich content + answers common pre-booking questions */}
      <section id="faq" className="relative z-10 mx-auto w-full max-w-3xl px-6 py-16 scroll-mt-20">
        <div className="reveal-on-scroll text-center">
          <h2 className="h2-cinematic h-accent inline-block text-2xl font-bold uppercase tracking-wider sm:text-3xl">
            Frequently Asked Questions
          </h2>
        </div>
        <div className="mt-10 space-y-4">
          {live.faqs.map((q, i) => (
            <details
              key={q.question}
              className="glass-card scroll-card group rounded-2xl p-5"
              data-stagger-i={i}
            >
              <summary className="flex cursor-pointer list-none items-start justify-between gap-3 text-lg font-semibold text-white">
                <span>{q.question}</span>
                <span className="text-2xl text-gold-400 transition-transform group-open:rotate-45">+</span>
              </summary>
              <p className="mt-3 text-base leading-relaxed text-gray-200">{q.answer}</p>
            </details>
          ))}
        </div>
        <p className="mt-8 text-center text-base text-gray-200">
          Still have questions?{' '}
          <a href="#contact" className="text-gold-300 underline-offset-4 hover:underline">
            Contact us
          </a>{' '}
          or{' '}
          <Link href="/auth" className="text-gold-300 underline-offset-4 hover:underline">
            book a detail
          </Link>{' '}
          to get started.
        </p>
      </section>

      {/* Watch Us Work - lazy-loaded so the videos don't stall first paint.
          Each <video> stays src-less until LazyVideo's IntersectionObserver
          fires when this section scrolls into view. Real AAD footage only:
          the garage and the van, side by side on desktop, stacked on mobile. */}
      <section className="relative z-10 mx-auto w-full max-w-5xl px-6 py-16">
        <div className="reveal-on-scroll text-center">
          <h2 className="h2-cinematic h-accent inline-block text-2xl font-bold uppercase tracking-wider sm:text-3xl">
            Watch Us Work
          </h2>
          <p className="mt-3 text-base text-gray-200 sm:text-lg">
            Real jobs. Real results.
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

      {/* What customers say - the only third-party voice on the page. Every
          other proof block here is us making a claim about ourselves, so this
          sits last, immediately before the booking CTA. It deliberately does
          not sit next to Our Mission: that section is itself a pull quote, and
          seven quote cards above it blunted the tonal break it exists to make.
          CSS columns rather than a grid because the quotes vary in length and
          seven cards would leave an orphan in any 2 or 3 column grid. The block
          reveals as one unit: columns fill top-to-bottom, so a per-card stagger
          keyed to DOM index would fire out of visual order.
          Deliberately no stars: nothing here carries a rating, and drawing
          five gold stars would imply a score Alex never collected. */}
      <section
        id="reviews"
        aria-label="What customers say"
        className="relative z-10 mx-auto w-full max-w-5xl px-6 py-16 scroll-mt-20"
      >
        <div className="reveal-on-scroll">
          <h2 className="h2-cinematic h-accent text-2xl font-bold uppercase tracking-wider sm:text-3xl">
            What Customers Say
          </h2>
        </div>
        <div className="reveal-on-scroll mt-10 gap-x-5 sm:columns-2 lg:columns-3">
          {live.reviews.map((r) => (
            <figure
              key={`${r.name}-${r.vehicle}`}
              className="glass-card mb-5 break-inside-avoid rounded-2xl p-6"
            >
              <span aria-hidden className="font-serif text-3xl leading-none text-gold-400">
                &ldquo;
              </span>
              <blockquote className="mt-2 text-base leading-relaxed text-gray-200">
                {r.text}
              </blockquote>
              <figcaption className="mt-4 border-t border-white/10 pt-3 text-sm">
                <span className="font-bold text-white">{r.name}</span>
                <span className="text-gray-400"> &middot; {r.vehicle}</span>
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="relative z-10 mx-auto w-full max-w-5xl px-6 pb-16">
        <div className="lift-hover relative overflow-hidden rounded-3xl border border-white/10 reveal-on-scroll">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={BOOK_CTA_IMAGE.src}
            alt="Book mobile detailing in Phoenix, AZ - on-site car detailing at your home or office"
            width={1920}
            height={1080}
            loading="lazy"
            decoding="async"
            className="absolute inset-0 h-full w-full object-cover animate-banner-pan"
          />
          {/* Foam pre-wash cinemagraph from our own photo; still is fallback. */}
          <AmbientVideo src="/images/aad/foam-loop.mp4" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/65 to-black/30" />
          <div className="relative flex flex-col items-start gap-4 p-10 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.35em] text-gold-400">
                Ready when you are
              </p>
              <h3 className="mt-2 text-2xl font-bold text-white sm:text-3xl">
                Mobile Detailing in Phoenix
              </h3>
              <p className="mt-2 max-w-xl text-base text-gray-100 sm:text-lg">
                Quality on-site detailing brought to you. Pick a slot, we&apos;ll show up with everything we need. No deposit, you pay on-site once the work is done.
              </p>
            </div>
            <Link
              href="/auth"
              className="btn-primary press inline-block shrink-0 rounded-xl px-7 py-4 text-base font-semibold sm:text-lg"
            >
              Book Now →
            </Link>
          </div>
        </div>
      </section>

      {/* Contact */}
      <section id="contact" className="relative z-10 mx-auto w-full max-w-5xl px-6 pb-16 scroll-mt-20">
        <div className="reveal-on-scroll">
          <h2 className="h2-cinematic h-accent text-2xl font-bold uppercase tracking-wider sm:text-3xl">
            Contact Signature Mobile Detailing
          </h2>
          <p className="mt-3 text-base text-gray-200 sm:text-lg">
            Mobile detailing across Phoenix, Scottsdale, Tempe, Mesa, Chandler, Gilbert, Glendale, and Peoria. Call or text Alex at{' '}
            <a href="tel:+14807933782" className="font-semibold text-gold-300 underline-offset-4 hover:underline">
              (480) 793-3782
            </a>
            {' '}or Kane at{' '}
            <a href="tel:+16028815602" className="font-semibold text-gold-300 underline-offset-4 hover:underline">
              (602) 881-5602
            </a>
            , email{' '}
            <a href="mailto:info@signaturemobiledetailaz.com" className="font-semibold text-gold-300 underline-offset-4 hover:underline">
              info@signaturemobiledetailaz.com
            </a>
            , or{' '}
            <Link href="/auth" className="text-gold-300 underline-offset-4 hover:underline">
              book online
            </Link>
            . We&apos;ll confirm within 24 hours.
          </p>
          <p className="mt-3 text-sm font-semibold uppercase tracking-wider text-gold-300">
            {live.availability}
          </p>
          <div className="mt-6">
            <p className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-300">
              Service Area
            </p>
            <ServiceMapLoader />
          </div>
        </div>
      </section>

      {/* Footer */}
      <SiteFooter availability={live.availability} />

      <H2CinematicObserver />
      <ScrollCardObserver />
      <HeroParallax />
      {/* Floating "Book Now" pill that fades in once visitor scrolls past hero. */}
      <StickyBookCta />
      <InstallAppPrompt />
      <MobileBottomBar />
      <PagePolish />
    </main>
  );
}

// Service icon size standardized at 24px so they sit consistently inside
// the red-accented circular badge in ServiceCard.
const ICON_SIZE = 24;

type ServiceCardDef = {
  icon: ReactNode;
  title: string;
  description: string;
  priceLabel: string;
  // When set, the trailing price on priceLabel comes from the live
  // portal-managed price table so the card can never disagree with
  // the pricing section below it.
  addonId?: string;
};

const SERVICES: ServiceCardDef[] = [
  {
    icon: <Sparkles size={ICON_SIZE} aria-hidden />,
    title: 'Full Detail',
    description: 'Complete interior and exterior reset. Hand wash, decontamination, and clay bar outside. Vacuum, shampoo, and full surface dressing inside.',
    priceLabel: '',
  },
  {
    icon: <Car size={ICON_SIZE} aria-hidden />,
    title: 'Exterior Detailing',
    description: 'Hand wash, decontamination, clay bar, and trim/tire dressing. Your paint reset to like-new.',
    priceLabel: '',
  },
  {
    icon: <Sofa size={ICON_SIZE} aria-hidden />,
    title: 'Interior Detailing',
    description: 'Vacuum, shampoo carpets and seats, wipe and dress every surface. Cabin completely reset.',
    priceLabel: '',
  },
  {
    icon: <Shield size={ICON_SIZE} aria-hidden />,
    title: 'Ceramic Coating',
    description: 'Premium clear coat that lasts up to 10 years. Adds deep gloss and shields paint from UV, water spots, and contaminants.',
    priceLabel: 'Quote',
  },
  {
    icon: <MapPin size={ICON_SIZE} aria-hidden />,
    title: 'Mobile - We Come To You',
    description: 'Driveway, office parking lot, garage - anywhere in the Phoenix valley. Three slots a day so you get our full attention.',
    priceLabel: '',
  },
];

// Three reasons mapped to the three things customers actually weigh:
// convenience, quality, price. Each headline is the dimension; each title +
// description sells our take on it.
const REASONS = [
  {
    headline: 'Convenience',
    title: 'We come to you',
    description: 'Driveway, office, or garage - our van is fully self-contained. No driving across town, no waiting rooms.',
  },
  {
    headline: 'Quality',
    title: 'Quality over quantity',
    description: 'Six details a day max. Your car gets focus and care, not assembly-line speed. Showroom-ready, guaranteed.',
  },
  {
    headline: 'Fair Price',
    title: 'No surprises, no travel fees',
    description: 'Flat rates with travel included. Returning-customer discount on every visit. What you see is what you pay.',
  },
];

// Three trust signals that pair with the time-saved stat above.
// Each one answers a quiet objection: "is this guy reliable?",
// "what if it sucks?", "what's the catch?".
const TRUST_PILLARS = [
  {
    icon: '👤',
    title: 'Owner-Operated',
    description: 'Alex and Kane own the business fifty-fifty and do every detail themselves. No revolving crew of contractors. Call us and you get an owner, not a call center.',
  },
  {
    icon: '✅',
    title: 'Showroom-Ready, Guaranteed',
    description: "Not happy with how something turned out? We make it right before we leave. That's the standard.",
  },
  {
    icon: '🔒',
    title: 'Nothing to Pay Up Front',
    description: "No deposit, no card needed to book. You pay on-site after the detail is done and you've seen the work.",
  },
];

// FAQ content lives in lib/cms.ts (portal-editable with baked-in defaults).

