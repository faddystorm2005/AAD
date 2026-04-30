import Link from 'next/link';
import { DASHBOARD_BANNER, BOOK_CTA_IMAGE } from '@/lib/siteImages';
import HomeNavAccountLink from '@/components/HomeNavAccountLink';
import HeroSpotlight from '@/components/home/HeroSpotlight';
import StatsStrip from '@/components/home/StatsStrip';
import StickyBookCta from '@/components/home/StickyBookCta';
import MarqueeTestimonials from '@/components/home/MarqueeTestimonials';

/**
 * Public marketing homepage. Server-rendered so crawlers + first-time
 * visitors see real content (services, value prop, CTAs) instead of a
 * loading splash. Logged-in visitors see the same marketing page; they
 * can navigate to their account via the "My Dashboard" link in the nav
 * (rendered by HomeNavAccountLink based on their auth state).
 */
export default function Home() {
  return (
    <main role="main" className="relative min-h-screen overflow-hidden bg-black text-white">

      {/* Sticky nav with keyword-rich anchor links + persistent Book CTA. */}
      <header className="sticky top-0 z-50 border-b border-white/10 bg-black/80 backdrop-blur">
        <nav
          className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-6 py-4"
          aria-label="Primary"
        >
          <Link
            href="/"
            className="text-base font-bold uppercase tracking-[0.18em] text-white"
            aria-label="Austin Auto Detail home"
          >
            Austin Auto Detail
          </Link>
          <div className="hidden items-center gap-6 text-base font-medium text-gray-100 sm:flex">
            <a href="#services" className="hover:text-red-300">Services</a>
            <a href="#how-it-works" className="hover:text-red-300">How It Works</a>
            <a href="#faq" className="hover:text-red-300">FAQ</a>
            <a href="#contact" className="hover:text-red-300">Contact</a>
            <HomeNavAccountLink />
          </div>
          <Link
            href="/auth"
            className="btn-primary press shrink-0 rounded-lg px-4 py-2.5 text-sm font-semibold sm:px-5 sm:py-2.5 sm:text-base"
          >
            Book Now
          </Link>
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
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={DASHBOARD_BANNER.src}
            alt="Mobile detailing in Austin - professional auto detailing at your location"
            className="absolute inset-0 h-full w-full object-cover animate-banner-pan"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/70 to-black" />
          {/* Soft red glow that follows the cursor for premium polish. */}
          <HeroSpotlight />
          <div className="relative mx-auto flex h-full w-full max-w-5xl flex-col items-start justify-end px-6 pb-12">
            <p className="animate-fade-up text-sm font-semibold uppercase tracking-[0.4em] text-red-400 sm:text-base">
              Quality Over Quantity
            </p>
            <h1
              className="animate-fade-up text-gradient-hero mt-3 text-4xl font-bold uppercase tracking-[0.04em] sm:text-5xl md:text-6xl"
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
              Professional detailing brought right to your driveway, office, or garage. Interior, exterior, ceramic coatings, and paint correction. Booking takes about a minute.
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
          <h2 className="h-accent text-2xl font-bold uppercase tracking-wider sm:text-3xl">
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
            <div
              key={s.title}
              className="glass-card reveal-on-scroll lift-hover animate-fade-up rounded-2xl p-6"
              style={{ animationDelay: `${i * 60}ms` }}
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
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="relative z-10 mx-auto w-full max-w-5xl px-6 py-16 scroll-mt-20">
        <div className="reveal-on-scroll">
          <h2 className="h-accent text-2xl font-bold uppercase tracking-wider sm:text-3xl">
            How It Works
          </h2>
          <p className="mt-3 text-base text-gray-200 sm:text-lg">
            Booking mobile detailing in Austin takes about a minute. Here&apos;s how it goes:
          </p>
        </div>
        <ol className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-3">
          {STEPS.map((step, i) => (
            <li
              key={step.title}
              className="glass-card reveal-on-scroll animate-fade-up rounded-2xl p-6"
              style={{ animationDelay: `${i * 80}ms` }}
            >
              <div className="text-3xl font-bold text-red-500">{String(i + 1).padStart(2, '0')}</div>
              <h3 className="mt-2 text-lg font-bold text-white">{step.title}</h3>
              <p className="mt-2 text-base text-gray-200">{step.description}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Why us */}
      <section className="relative z-10 mx-auto w-full max-w-5xl px-6 py-16">
        <div className="reveal-on-scroll">
          <h2 className="h-accent text-2xl font-bold uppercase tracking-wider sm:text-3xl">
            Why Austin Auto Detail
          </h2>
        </div>
        <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-3">
          {REASONS.map((r, i) => (
            <div
              key={r.title}
              className="glass-card reveal-on-scroll animate-fade-up rounded-2xl p-6"
              style={{ animationDelay: `${i * 80}ms` }}
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
            <span className="text-gradient-hero">4+ hrs</span>
          </p>
          <p className="mt-2 text-sm uppercase tracking-[0.25em] text-gray-400">
            saved per detail
          </p>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-gray-300">
            No drop-off. No shop waiting room. No pickup. No Uber both ways.
            We work in your driveway while you keep your day.
          </p>
        </div>

        {/* Trust pillars */}
        <div className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-3">
          {TRUST_PILLARS.map((p, i) => (
            <div
              key={p.title}
              className="glass-card reveal-on-scroll animate-fade-up rounded-2xl p-6 text-center"
              style={{ animationDelay: `${i * 80}ms` }}
            >
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-red-500/40 bg-red-500/10 text-2xl">
                {p.icon}
              </div>
              <h3 className="mt-4 text-lg font-bold text-white">
                {p.title}
              </h3>
              <p className="mt-2 text-base text-gray-200">{p.description}</p>
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
          <h2 className="h-accent text-2xl font-bold uppercase tracking-wider sm:text-3xl">
            Frequently Asked Questions
          </h2>
        </div>
        <dl className="mt-10 space-y-4">
          {FAQS.map((q, i) => (
            <details
              key={q.question}
              className="glass-card reveal-on-scroll animate-fade-up group rounded-2xl p-5"
              style={{ animationDelay: `${i * 50}ms` }}
            >
              <summary className="flex cursor-pointer list-none items-start justify-between gap-3 text-lg font-semibold text-white">
                <span>{q.question}</span>
                <span className="text-2xl text-red-400 transition-transform group-open:rotate-45">+</span>
              </summary>
              <dd className="mt-3 text-base leading-relaxed text-gray-200">{q.answer}</dd>
            </details>
          ))}
        </dl>
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

      {/* Testimonials marquee - auto-scrolling social proof, pauses on hover. */}
      <section
        aria-label="What customers say"
        className="relative z-10 border-y border-white/5 py-12"
      >
        <div className="mx-auto mb-6 w-full max-w-5xl px-6">
          <h2 className="h-accent text-xl font-bold uppercase tracking-wider sm:text-2xl">
            What Austin drivers say
          </h2>
        </div>
        <MarqueeTestimonials />
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
          <h2 className="h-accent text-2xl font-bold uppercase tracking-wider sm:text-3xl">
            Contact Austin Auto Detail
          </h2>
          <p className="mt-3 text-base text-gray-200 sm:text-lg">
            Mobile detailing across Austin and the surrounding area. Call or text{' '}
            <a href="tel:+14807933782" className="font-semibold text-red-300 underline-offset-4 hover:underline">
              (480) 793-3782
            </a>
            , or{' '}
            <Link href="/auth" className="text-red-300 underline-offset-4 hover:underline">
              book online
            </Link>
            . We&apos;ll confirm within 24 hours.
          </p>
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
        <div className="mx-auto mt-8 flex w-full max-w-5xl items-center justify-between border-t border-white/10 pt-6 text-sm text-gray-300">
          <p>© {new Date().getFullYear()} Austin Auto Detail. Mobile detailing in Austin, TX.</p>
        </div>
      </footer>

      {/* Floating "Book Now" pill that fades in once visitor scrolls past hero. */}
      <StickyBookCta />
    </main>
  );
}

const SERVICES = [
  {
    icon: '🚗',
    title: 'Exterior Detailing',
    description: 'Hand wash, decontamination, clay bar, and trim/tire dressing. Your paint reset to like-new.',
    priceLabel: 'Part of full detail, from $199',
  },
  {
    icon: '🛋️',
    title: 'Interior Detailing',
    description: 'Vacuum, shampoo carpets and seats, wipe and dress every surface. Cabin completely reset.',
    priceLabel: 'Part of full detail, from $199',
  },
  {
    icon: '✨',
    title: 'Ceramic Coating',
    description: 'Premium clear coat that lasts up to 10 years. Adds gloss and protects paint from UV, water spots, and contaminants.',
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
    icon: '🧴',
    title: 'Stain Removal',
    description: 'Targeted treatment for stubborn upholstery, carpet, and seat stains. Coffee, ink, pet, you name it.',
    priceLabel: 'Add-on, from $30',
  },
  {
    icon: '📍',
    title: 'Mobile - We Come To You',
    description: 'Driveway, office parking lot, garage - anywhere in the Austin area. Three slots a day so you get our full attention.',
    priceLabel: '',
  },
];

const STEPS = [
  {
    title: 'Pick a slot',
    description: '9 AM, 1 PM, or 5 PM, any day. Real-time availability - no calls, no back-and-forth.',
  },
  {
    title: 'We confirm',
    description: 'Austin Auto Detail reviews your booking within 24 hours. No charge until we approve.',
  },
  {
    title: 'We come to you',
    description: 'On the day of service, our team arrives at your address with everything we need. You don’t move a thing.',
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
