import Link from 'next/link';
import Image from 'next/image';
import { SERVICE_TYPES, SERVICE_TYPE_NAMES, SERVICE_PRICES, ADD_ONS, RETURNING_CUSTOMER_DISCOUNT_RATE, DEPOSIT_AMOUNT } from '@/lib/bookingPricing';
import { DASHBOARD_BANNER, BOOK_CTA_IMAGE } from '@/lib/siteImages';
import HomeNavAccountLink from '@/components/HomeNavAccountLink';
import HeroSpotlight from '@/components/home/HeroSpotlight';
import StatsStrip from '@/components/home/StatsStrip';
import StickyBookCta from '@/components/home/StickyBookCta';
import InstallAppPrompt from '@/components/home/InstallAppPrompt';
import TiltCard from '@/components/home/TiltCard';
import H2CinematicObserver from '@/components/home/H2CinematicObserver';
import ScrollCardObserver from '@/components/ScrollCardObserver';
import HeroStatCounter from '@/components/HeroStatCounter';
import HeroParallax from '@/components/home/HeroParallax';
import MobileNav from '@/components/home/MobileNav';
import Timeline from '@/components/home/Timeline';
import BeforeAfterSlider from '@/components/home/BeforeAfterSlider';

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
export default function Home() {
  return (
    <main role="main" className="homepage-cinematic relative min-h-screen overflow-hidden bg-black text-white">
      <link
        rel="preload"
        as="image"
        fetchPriority="high"
        href="/images/aad/hero-s-class.jpg"
      />

      {/* Sticky nav with keyword-rich anchor links + persistent Book CTA. */}
      <header className="relative sticky top-0 z-50 border-b border-white/10 bg-black/80 backdrop-blur">
        <nav
          className="mx-auto flex w-full max-w-5xl items-center justify-between gap-2 px-4 py-4 sm:gap-4 sm:px-6"
          aria-label="Primary"
        >
          <Link
            href="/"
            className="flex shrink-0 items-center gap-2"
            aria-label="Austin Auto Detail home"
          >
            <Image
              src="/images/aad/logo.png"
              alt="Austin Auto Detail"
              width={180}
              height={48}
              priority
              className="h-9 w-auto sm:h-11"
            />
          </Link>
          <ul className="hidden list-none items-center gap-6 p-0 text-base font-medium text-gray-100 sm:flex">
            <li><a href="#services" className="hover:text-red-300">Services</a></li>
            <li><a href="#pricing" className="hover:text-red-300">Pricing</a></li>
            <li><a href="#recent-work" className="hover:text-red-300">Work</a></li>
            <li><a href="#how-it-works" className="hover:text-red-300">How It Works</a></li>
            <li><a href="#faq" className="hover:text-red-300">FAQ</a></li>
            <li><a href="#contact" className="hover:text-red-300">Contact</a></li>
          </ul>
          <div className="flex items-center gap-3 sm:gap-4">
            <a
              href="tel:+14807933782"
              className="flex items-center gap-1.5 font-semibold text-red-300 hover:text-red-200"
              aria-label="Call us at (480) 793-3782"
            >
              <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.8a19.79 19.79 0 01-3.07-8.68A2 2 0 012 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 14.92v2z" />
              </svg>
              <span className="hidden text-sm sm:inline">(480) 793-3782</span>
            </a>
            {/* Hidden on mobile — accessible via hamburger menu instead */}
            <div className="hidden sm:flex sm:items-center sm:gap-4">
              <HomeNavAccountLink />
              <Link
                href="/auth"
                className="btn-primary press shrink-0 rounded-lg px-5 py-2.5 text-base font-semibold"
              >
                Book Now
              </Link>
            </div>
            <MobileNav />
          </div>
        </nav>
      </header>

      {/* Ambient red glow at top + bottom */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-0 h-[600px]"
        style={{
          background:
            'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(214, 32, 48, 0.18), transparent 70%)',
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 -z-0 h-[300px]"
        style={{
          background:
            'radial-gradient(ellipse 60% 50% at 50% 100%, rgba(214, 32, 48, 0.08), transparent 70%)',
        }}
      />

      {/* Hero */}
      <section className="relative" id="main-content" tabIndex={-1}>
        <div className="relative h-[60vh] min-h-[480px] w-full overflow-hidden">
          {/* Blurred backdrop layer. Same image, heavily blurred and darkened,
              sits behind the sharp hero img to add depth and color halo
              when the foreground pans. Aria-hidden because the foreground
              img already has the alt text. */}
          <div className="hero-bg-back" aria-hidden>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={DASHBOARD_BANNER.src} alt="" />
          </div>
          {/* Parallax wrapper: JS moves this div at 0.38x scroll speed.
              The img inside keeps animate-banner-pan on a separate element
              so the two transforms never conflict. */}
          <div className="hero-parallax-wrap">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={DASHBOARD_BANNER.src}
              alt="Mobile detailing in Austin - professional auto detailing at your location"
              fetchPriority="high"
              className="absolute inset-0 h-full w-full object-cover animate-banner-pan"
              style={{ objectPosition: 'center 55%' }}
            />
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
            <p className="animate-fade-up text-sm font-semibold uppercase tracking-[0.4em] text-red-400 sm:text-base">
              Quality Over Quantity
            </p>
            <h1
              className="hero-swipe-reveal text-gradient-hero mt-3 text-4xl font-bold uppercase tracking-[0.04em] sm:text-5xl md:text-6xl"
              style={{ animationDelay: '80ms' }}
            >
              Mobile Detailing
              <br />
              in Austin
            </h1>
            <p
              className="animate-fade-up mt-5 max-w-xl text-lg text-gray-100 sm:text-xl"
              style={{ animationDelay: '160ms' }}
            >
              Professional detailing brought right to your driveway, office, or garage. We bring everything we need. You don&apos;t lift a finger.
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
              Prefer to call? <a href="tel:+14807933782" className="font-semibold text-red-300 underline-offset-4 hover:underline">(480) 793-3782</a>
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
            <Link href="/auth" className="text-red-300 underline-offset-4 hover:underline">
              Austin car cleaning
            </Link>
            ,{' '}
            <Link href="/auth" className="text-red-300 underline-offset-4 hover:underline">
              auto detailing services
            </Link>
            , and ceramic coatings. No driving across town, no waiting rooms.
          </p>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {SERVICES.map((s, i) => (
            <div key={s.title} className="scroll-card" data-stagger-i={i}>
            <TiltCard
              className="glass-card rounded-2xl p-6"
            >
              <div className="text-3xl">{s.icon}</div>
              <h3 className="mt-4 text-lg font-bold text-white">{s.title}</h3>
              <p className="mt-2 text-base text-gray-200">{s.description}</p>
              {s.priceLabel ? (
                <p className="mt-3 text-sm font-semibold uppercase tracking-wider text-red-300">
                  {s.priceLabel}
                </p>
              ) : null}
              <Link
                href="/auth"
                className="mt-4 inline-flex text-sm font-semibold uppercase tracking-wider text-red-300 hover:text-red-200"
              >
                Book this service →
              </Link>
            </TiltCard>
            </div>
          ))}
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
            Flat rates by vehicle size. Travel included, no surprise fees. A ${DEPOSIT_AMOUNT} deposit holds your slot, the rest is paid on-site.
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
                    ? 'sm:col-span-2 border border-red-500/50 bg-gradient-to-b from-red-500/[0.08] via-zinc-950 to-black px-6 py-8 sm:p-10 shadow-[0_0_60px_-10px_rgba(214,32,48,0.35)]'
                    : 'glass-card lift-hover'
                }`}
                data-stagger-i={i}
              >
                {isFeatured && (
                  <span className="absolute left-1/2 top-0 -translate-x-1/2 rounded-b-lg bg-red-600 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-white shadow-[0_4px_14px_rgba(214,32,48,0.4)]">
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
                          <svg className="h-3.5 w-3.5 shrink-0 text-red-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 13l4 4L19 7" /></svg>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className={isFeatured ? 'mt-6 sm:mt-0 sm:flex sm:flex-col sm:justify-center' : ''}>
                    <div className={`space-y-3 ${isFeatured ? 'sm:border-l sm:border-red-500/20 sm:pl-8' : 'mt-5 border-t border-white/10 pt-4'}`}>
                      <div className="flex items-center justify-between">
                        <span className="text-base text-gray-200">Coupe / Sedan</span>
                        <span className={`font-bold text-red-300 ${isFeatured ? 'text-2xl' : 'text-xl'}`}>${SERVICE_PRICES[type].small}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-base text-gray-200">SUV</span>
                        <span className={`font-bold text-red-300 ${isFeatured ? 'text-2xl' : 'text-xl'}`}>${SERVICE_PRICES[type].suv}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-base text-gray-200">Truck / 3-Row</span>
                        <span className={`font-bold text-red-300 ${isFeatured ? 'text-2xl' : 'text-xl'}`}>${SERVICE_PRICES[type].truck}</span>
                      </div>
                    </div>
                    <Link
                      href="/auth"
                      className={`mt-5 inline-flex text-sm font-semibold uppercase tracking-wider text-red-300 hover:text-red-200 ${isFeatured ? 'sm:pl-8' : ''}`}
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
          <h3 className="text-base font-semibold uppercase tracking-[0.25em] text-red-400">
            Add-On Services
          </h3>
          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {ADD_ONS.map((addon) => {
              const priceLabel = addon.sizePrices
                ? `from $${addon.sizePrices.small}`
                : `$${addon.price}`;
              return (
                <div
                  key={addon.id}
                  className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3"
                >
                  <span className="text-base text-gray-100">{addon.name}</span>
                  <span className="text-base font-semibold text-red-300">{priceLabel}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Returning customer banner: full-width dark card with a solid
            red accent bar on the left, matching the cinematic preview. */}
        <div className="reveal-on-scroll relative mt-8 flex items-start gap-4 overflow-hidden rounded-2xl border border-white/10 bg-zinc-950/80 px-5 py-5 pl-6 sm:items-center">
          <span aria-hidden className="absolute left-0 top-0 h-full w-1 bg-red-500" />
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

      {/* Results showcase — specific vehicles + service labels so visitors
          can see exactly what level of finish they're paying for. Swap in
          real before/after pairs as they come in. */}
      <section className="relative z-10 mx-auto w-full max-w-5xl px-6 py-16">
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
                alt={`${vehicle}, ${service} by Austin Auto Detail`}
                loading="lazy"
                className="aspect-square w-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-3">
                <p className="text-xs font-semibold text-white">{vehicle}</p>
                <p className="text-xs text-red-300">{service}</p>
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
            href="https://www.tiktok.com/@austinautodetail"
            target="_blank"
            rel="noopener noreferrer"
            className="lift-hover group relative flex flex-col overflow-hidden rounded-3xl border border-white/10 sm:flex-row"
            aria-label="Follow Austin Auto Detail on TikTok - watch before and afters"
          >
            {/* Ambient glow + base background */}
            <div aria-hidden className="tiktok-card-bg pointer-events-none absolute inset-0" />
            {/* TikTok icon panel */}
            <div className="relative flex shrink-0 items-center justify-center border-b border-white/5 bg-black/40 px-10 py-8 sm:border-b-0 sm:border-r sm:border-white/5 sm:px-14 sm:py-10">
              <div className="flex h-[72px] w-[72px] items-center justify-center rounded-2xl bg-zinc-900 ring-1 ring-white/10 transition-all duration-500 group-hover:ring-red-500/60 group-hover:shadow-[0_0_28px_rgba(214,32,48,0.4)]">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="h-9 w-9 text-white"
                  aria-hidden="true"
                >
                  <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5.8 20.1a6.34 6.34 0 0 0 10.86-4.43V8.2a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1.84-.63z" />
                </svg>
              </div>
            </div>
            {/* Content panel */}
            <div className="relative flex flex-1 flex-col justify-center p-8 sm:p-10">
              <p className="text-xs font-semibold uppercase tracking-[0.4em] text-red-500">
                Behind the Scenes
              </p>
              <h2 className="mt-2 text-2xl font-bold uppercase tracking-wider text-white sm:text-3xl">
                Watch Every Detail Live
              </h2>
              <p className="mt-3 max-w-lg text-base leading-relaxed text-gray-300">
                Before and afters. Deep-clean transformations. The
                satisfying moments most customers never see. Real cars,
                real Austin drivers. Follow along and see what
                yours could look like.
              </p>
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <span className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors duration-200 group-hover:bg-red-500">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className="h-4 w-4 shrink-0"
                    aria-hidden="true"
                  >
                    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5.8 20.1a6.34 6.34 0 0 0 10.86-4.43V8.2a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1.84-.63z" />
                  </svg>
                  Follow @austinautodetail →
                </span>
                <span className="text-sm text-gray-500">Free to watch &amp; follow</span>
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
            Booking mobile detailing in Austin takes about a minute. Here&apos;s how it goes:
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
            Why Austin Auto Detail
          </h2>
        </div>
        <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-3">
          {REASONS.map((r, i) => (
            <div
              key={r.title}
              className="glass-card scroll-card rounded-2xl p-6"
              data-stagger-i={i}
            >
              <p className="text-2xl font-bold text-red-400 sm:text-3xl">{r.headline}</p>
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
          <p className="text-xs font-semibold uppercase tracking-[0.4em] text-red-500">
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
          <p className="mt-2 text-sm uppercase tracking-[0.25em] text-gray-400">
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
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-red-500/40 bg-red-500/10 text-2xl">
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
        <div className="mx-auto w-full max-w-3xl px-6 text-center">
          <p className="reveal-on-scroll text-xs font-semibold uppercase tracking-[0.4em] text-red-500">
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
          <p className="reveal-on-scroll mt-6 text-base leading-relaxed text-gray-400">
            We treat every vehicle like it&apos;s our own. That&apos;s why we
            cap at three details a day, bring everything to your door, and
            don&apos;t cut a single corner. Cars take you to the people and
            places that matter, so they should look the part.
          </p>
          <p className="reveal-on-scroll mt-6 text-xs uppercase tracking-[0.3em] text-gray-500">
            Alex, Founder
          </p>
        </div>
      </section>

      {/* FAQ - adds keyword-rich content + answers common pre-booking questions */}
      <section id="faq" className="relative z-10 mx-auto w-full max-w-3xl px-6 py-16 scroll-mt-20">
        <div className="reveal-on-scroll">
          <h2 className="h2-cinematic h-accent text-2xl font-bold uppercase tracking-wider sm:text-3xl">
            Frequently Asked Questions
          </h2>
        </div>
        <div className="mt-10 space-y-4">
          {FAQS.map((q, i) => (
            <details
              key={q.question}
              className="glass-card scroll-card group rounded-2xl p-5"
              data-stagger-i={i}
            >
              <summary className="flex cursor-pointer list-none items-start justify-between gap-3 text-lg font-semibold text-white">
                <span>{q.question}</span>
                <span className="text-2xl text-red-400 transition-transform group-open:rotate-45">+</span>
              </summary>
              <p className="mt-3 text-base leading-relaxed text-gray-200">{q.answer}</p>
            </details>
          ))}
        </div>
        <p className="mt-8 text-center text-base text-gray-200">
          Still have questions?{' '}
          <a href="#contact" className="text-red-300 underline-offset-4 hover:underline">
            Contact us
          </a>{' '}
          or{' '}
          <Link href="/auth" className="text-red-300 underline-offset-4 hover:underline">
            book a detail
          </Link>{' '}
          to get started.
        </p>
      </section>

      {/* See the Transformation. Three before/after sliders on cropped
          composite images. TODO: replace with real before/after pairs from
          Alex when he sends them (4-6 pairs, see migration plan). */}
      <section
        id="transformations"
        className="relative z-10 mx-auto w-full max-w-5xl px-6 py-16 scroll-mt-20"
      >
        <div className="reveal-on-scroll">
          <h2 className="h2-cinematic h-accent text-2xl font-bold uppercase tracking-wider sm:text-3xl">
            See the Transformation
          </h2>
          <p className="mt-3 text-base text-gray-200 sm:text-lg">
            Drag the slider on each photo to see the difference.
          </p>
        </div>
        <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {/* TODO: replace with real before/after pair from Alex */}
          <BeforeAfterSlider
            src="/images/aad/before-after-paint-1.jpg"
            caption="Black hood, paint correction"
          />
          {/* TODO: replace with real before/after pair from Alex */}
          <BeforeAfterSlider
            src="/images/aad/before-after-paint-2.webp"
            caption="Audi S5, swirl mark removal"
          />
          {/* TODO: replace with real before/after pair from Alex */}
          <BeforeAfterSlider
            src="/images/aad/before-after-ceramic.webp"
            caption="Ceramic coating, water beading"
            afterSide="left"
          />
        </div>
      </section>

      {/* Watch Us Work - autoplay video reel. Videos play muted + looped so
          they behave like animated photos. No controls = no distraction.
          The two portrait clips get their own narrower column on desktop. */}
      <section className="relative z-10 mx-auto w-full max-w-5xl px-6 py-16">
        <div className="reveal-on-scroll">
          <h2 className="h2-cinematic h-accent text-2xl font-bold uppercase tracking-wider sm:text-3xl">
            Watch Us Work
          </h2>
          <p className="mt-3 text-base text-gray-200 sm:text-lg">
            Real jobs. Real results.
          </p>
        </div>
        <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[
            '/images/aad/6158071-hd_1920_1080_30fps.mp4',
            '/images/aad/6158118-hd_1920_1080_30fps.mp4',
            '/images/aad/6159205-hd_1920_1080_30fps.mp4',
          ].map((src) => (
            <video
              key={src}
              src={src}
              autoPlay
              muted
              loop
              playsInline
              preload="metadata"
              className="aspect-video w-full rounded-2xl border border-white/10 object-cover"
            />
          ))}
        </div>
      </section>

      {/* Recent Work - 16-photo gallery from the field. */}
      <section
        id="recent-work"
        className="relative z-10 mx-auto w-full max-w-5xl px-6 py-16 scroll-mt-20"
      >
        <div className="reveal-on-scroll">
          <h2 className="h2-cinematic h-accent text-2xl font-bold uppercase tracking-wider sm:text-3xl">
            Recent Work
          </h2>
          <p className="mt-3 text-base text-gray-200 sm:text-lg">
            Sixteen of the vehicles we&apos;ve detailed lately
          </p>
        </div>
        <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {RECENT_WORK_PHOTOS.map((src, i) => (
            <div
              key={src}
              className="group overflow-hidden rounded-2xl border border-white/10 bg-gray-900"
              data-stagger-i={i}
            >
              <Image
                src={src}
                alt={`Austin Auto Detail recent work, photo ${i + 1}`}
                width={1200}
                height={900}
                sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
                className="aspect-square w-full object-cover transition-transform duration-500 group-hover:scale-105"
                loading="lazy"
              />
            </div>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="relative z-10 mx-auto w-full max-w-5xl px-6 pb-16">
        <div className="lift-hover relative overflow-hidden rounded-3xl border border-white/10 reveal-on-scroll">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={BOOK_CTA_IMAGE.src}
            alt="Book mobile detailing in Austin - professional on-site car cleaning"
            className="absolute inset-0 h-full w-full object-cover animate-banner-pan"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/65 to-black/30" />
          <div className="relative flex flex-col items-start gap-4 p-10 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.35em] text-red-400">
                Ready when you are
              </p>
              <h3 className="mt-2 text-2xl font-bold text-white sm:text-3xl">
                Mobile Detailing in Austin
              </h3>
              <p className="mt-2 max-w-xl text-base text-gray-100 sm:text-lg">
                Quality on-site detailing brought to you. Pick a slot, we&apos;ll show up with everything we need. Pay a $30 deposit when we approve; the rest on-site.
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
            Contact Austin Auto Detail
          </h2>
          <p className="mt-3 text-base text-gray-200 sm:text-lg">
            Mobile detailing across Austin and the surrounding area. Call or text{' '}
            <a href="tel:+14807933782" className="font-semibold text-red-300 underline-offset-4 hover:underline">
              (480) 793-3782
            </a>
            , email{' '}
            <a href="mailto:info@austin-autodetail.com" className="font-semibold text-red-300 underline-offset-4 hover:underline">
              info@austin-autodetail.com
            </a>
            , or{' '}
            <Link href="/auth" className="text-red-300 underline-offset-4 hover:underline">
              book online
            </Link>
            . We&apos;ll confirm within 24 hours.
          </p>
          <p className="mt-3 text-sm font-semibold uppercase tracking-wider text-red-300">
            Available 7 days a week, by appointment.
          </p>
          <div className="mt-6">
            <p className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-400">
              Areas we cover
            </p>
            <div className="flex flex-wrap gap-2">
              {[
                'Downtown Austin', 'South Austin', 'East Austin', 'North Austin',
                'The Domain', 'Round Rock', 'Cedar Park', 'Georgetown',
                'Pflugerville', 'Buda / Kyle', 'Lakeway / Westlake', 'Dripping Springs',
              ].map((area) => (
                <span
                  key={area}
                  className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-sm text-gray-300"
                >
                  {area}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/10 px-6 py-12">
        <div className="mx-auto grid w-full max-w-5xl gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="text-base font-bold uppercase tracking-[0.18em] text-white">
              Austin Auto Detail
            </p>
            <p className="mt-3 text-base text-gray-200">
              Mobile detailing in Austin. Quality over quantity. We come to you for interior, exterior, ceramic coatings, paint correction, and more.
            </p>
            <p className="mt-4 text-base text-gray-200">
              <a href="tel:+14807933782" className="font-semibold text-red-300 underline-offset-4 hover:underline">
                (480) 793-3782
              </a>
            </p>
            <p className="mt-2 text-base text-gray-200">
              <a href="mailto:info@austin-autodetail.com" className="font-semibold text-red-300 underline-offset-4 hover:underline">
                info@austin-autodetail.com
              </a>
            </p>
            <p className="mt-2 text-sm text-gray-300">
              Available 7 days a week, by appointment.
            </p>
          </div>
          <nav aria-label="Services">
            <p className="text-sm font-semibold uppercase tracking-wider text-gray-300">
              Services
            </p>
            <ul className="mt-3 space-y-2 text-base text-gray-200">
              <li><a href="#services" className="hover:text-white">Mobile Detailing</a></li>
              <li><a href="#services" className="hover:text-white">Ceramic Coating</a></li>
              <li><a href="#services" className="hover:text-white">Paint Correction</a></li>
              <li><a href="#services" className="hover:text-white">Car Cleaning</a></li>
            </ul>
          </nav>
          <nav aria-label="Site">
            <p className="text-sm font-semibold uppercase tracking-wider text-gray-300">
              Site
            </p>
            <ul className="mt-3 space-y-2 text-base text-gray-200">
              <li><a href="#main-content" className="hover:text-white">Home</a></li>
              <li><a href="#pricing" className="hover:text-white">Pricing</a></li>
              <li><a href="#recent-work" className="hover:text-white">Recent Work</a></li>
              <li><a href="#how-it-works" className="hover:text-white">How It Works</a></li>
              <li><a href="#faq" className="hover:text-white">FAQ</a></li>
              <li><a href="#contact" className="hover:text-white">Contact</a></li>
            </ul>
          </nav>
          <nav aria-label="Account">
            <p className="text-sm font-semibold uppercase tracking-wider text-gray-300">
              Get Started
            </p>
            <ul className="mt-3 space-y-2 text-base text-gray-200">
              <li><Link href="/auth" className="hover:text-white">Book a Detail</Link></li>
              <li><Link href="/auth" className="hover:text-white">Sign In</Link></li>
              <li><Link href="/auth" className="hover:text-white">Create Account</Link></li>
            </ul>
          </nav>
        </div>
        <div className="mx-auto mt-8 flex w-full max-w-5xl flex-col items-center gap-3 border-t border-white/10 pt-6 text-sm text-gray-300 sm:flex-row sm:justify-between">
          <p>© {new Date().getFullYear()} Austin Auto Detail. Mobile detailing in Austin, TX.</p>
          <p className="text-xs text-gray-600 italic">
            &ldquo;Whatever you do, work at it with all your heart, as working for the Lord.&rdquo; &middot; Col. 3:23
          </p>
        </div>
      </footer>

      <H2CinematicObserver />
      <ScrollCardObserver />
      <HeroParallax />
      {/* Floating "Book Now" pill that fades in once visitor scrolls past hero. */}
      <StickyBookCta />
      <InstallAppPrompt />
    </main>
  );
}

const SERVICES = [
  {
    icon: '⭐',
    title: 'Full Detail',
    description: 'Complete interior and exterior reset. Hand wash, decontamination, and clay bar outside. Vacuum, shampoo, and full surface dressing inside.',
    priceLabel: '',
  },
  {
    icon: '🚗',
    title: 'Exterior Detailing',
    description: 'Hand wash, decontamination, clay bar, and trim/tire dressing. Your paint reset to like-new.',
    priceLabel: '',
  },
  {
    icon: '🛋️',
    title: 'Interior Detailing',
    description: 'Vacuum, shampoo carpets and seats, wipe and dress every surface. Cabin completely reset.',
    priceLabel: '',
  },
  {
    icon: '✨',
    title: 'Ceramic Coating',
    description: 'Premium clear coat that delivers multi-year protection. Adds gloss and shields paint from UV, water spots, and contaminants.',
    priceLabel: 'Quote',
  },
  {
    icon: '🪞',
    title: 'Paint Correction',
    description: 'One- or two-step paint correction to remove swirl marks, oxidation, and minor scratches. Restores depth and clarity.',
    priceLabel: 'Add-on, from $95',
  },
  {
    icon: '🛡️',
    title: '6-Month Wax',
    description: 'Long-lasting wax application for daily protection from sun, rain, and road grime - without committing to a coating.',
    priceLabel: 'Add-on, from $50',
  },
  {
    icon: '🔧',
    title: 'Engine Bay Cleaning',
    description: 'Deep degrease and dress under the hood. Brings the engine bay back to showroom clean.',
    priceLabel: 'Add-on, from $25',
  },
  {
    icon: '🫧',
    title: 'Stain Removal',
    description: 'Targeted treatment for stubborn upholstery, carpet, and seat stains. Coffee, ink, pet, you name it.',
    priceLabel: 'Add-on, from $30',
  },
  {
    icon: '💡',
    title: 'Headlight Restoration',
    description: 'Cloudy, yellowed headlights brought back to clear like-new condition. Improves nighttime visibility and curb appeal.',
    priceLabel: 'Standalone or add-on, $80',
  },
  {
    icon: '🪟',
    title: 'Windshield Coating',
    description: 'Hydrophobic glass treatment that repels rain and improves visibility at highway speeds. Lasts months, not weeks.',
    priceLabel: 'Add-on, from $40',
  },
  {
    icon: '🧴',
    title: 'Leather Conditioning',
    description: 'Deep clean and condition for leather seats and surfaces. Prevents cracking and restores that new-car softness.',
    priceLabel: 'Add-on, from $10',
  },
  {
    icon: '📍',
    title: 'Mobile - We Come To You',
    description: 'Driveway, office parking lot, garage - anywhere in the Austin area. Three slots a day so you get our full attention.',
    priceLabel: '',
  },
];

// Recent Work gallery photos. Listed explicitly so deleting a file from
// /public/images/aad/ doesn't show a broken square on the homepage.
// Mix of numbered files and the named gallery shots that actually exist
// on disk after the most recent cleanup.
const RECENT_WORK_PHOTOS: string[] = [
  '/images/aad/1.jpg',
  '/images/aad/2.jpg',
  '/images/aad/3.jpg',
  '/images/aad/4.jpg',
  '/images/aad/5.jpg',
  '/images/aad/6.jpg',
  '/images/aad/7.jpg',
  '/images/aad/9.jpg',
  '/images/aad/10.jpg',
  '/images/aad/11.jpg',
  '/images/aad/gallery-ford-king-ranch.jpg',
  '/images/aad/gallery-bmw-engine-bay.jpg',
  '/images/aad/gallery-ford-super-duty.jpg',
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
    description: 'Three details a day max. Your car gets focus and care, not assembly-line speed. Showroom-ready, guaranteed.',
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
    description: 'Hands-on, locally run, and accountable. No revolving crew of contractors. The person who answers the phone is the person who details the car.',
  },
  {
    icon: '✅',
    title: 'Showroom-Ready, Guaranteed',
    description: "Not happy with how something turned out? We make it right before we leave. That's the standard.",
  },
  {
    icon: '🔒',
    title: 'Just $30 to Hold Your Slot',
    description: "Pay a small refundable-as-credit deposit to lock in. The rest is paid on-site after you've seen the work.",
  },
];

const FAQS = [
  {
    question: 'Where do you offer mobile detailing in Austin?',
    answer: 'We service Austin and surrounding areas. Our detail van is fully self-contained - we bring our own water and power, so all you need is a spot for the vehicle. Driveway, office parking lot, or garage all work.',
  },
  {
    question: 'How long does a typical detail take?',
    answer: 'Most interior + exterior details take 2–3 hours. Paint correction adds 1–2 hours. Ceramic coatings are a full-day job - that’s why we only book one ceramic coating per day at the 9 AM slot.',
  },
  {
    question: 'Do I need to be home during the service?',
    answer: 'Not necessarily. As long as we have access to the vehicle and the agreed location, you can be at work or running errands. We’ll send updates as we progress.',
  },
  {
    question: 'How does payment work?',
    answer: 'After we approve your booking, you pay a $30 deposit online to lock in your slot. The remaining balance is due on-site after the service is complete.',
  },
  {
    question: 'What’s included in Austin car cleaning?',
    answer: 'Our base detail covers a full exterior wash, hand-dry, vacuum, interior wipe-down, window cleaning, and tire dressing. Add-ons cover wax, paint correction, ceramic coating, engine bay cleaning, leather conditioning, stain removal, and windshield treatment.',
  },
  {
    question: 'Can I cancel or reschedule?',
    answer: 'Yes. To reschedule, open your booking and pick a new time. You can do that yourself any time before service. To cancel, tap Request Cancellation and add a quick reason. We\'ll review within 24 hours. Once approved, your $30 deposit becomes account credit toward a future booking.',
  },
];

