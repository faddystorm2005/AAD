import Link from 'next/link';
import AuthRedirector from '@/components/AuthRedirector';
import { DASHBOARD_BANNER, BOOK_CTA_IMAGE } from '@/lib/siteImages';

/**
 * Public marketing homepage. Server-rendered so crawlers + first-time
 * visitors see real content (services, value prop, CTAs) instead of a
 * loading splash. Logged-in visitors are silently redirected to /dashboard
 * via the AuthRedirector client component.
 */
export default function Home() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-black text-white">
      <AuthRedirector />

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
      <section className="relative">
        <div className="relative h-[60vh] min-h-[480px] w-full overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={DASHBOARD_BANNER.src}
            alt={DASHBOARD_BANNER.alt}
            className="absolute inset-0 h-full w-full object-cover animate-banner-pan"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/70 to-black" />
          <div className="relative mx-auto flex h-full w-full max-w-5xl flex-col items-start justify-end px-6 pb-12">
            <p className="animate-fade-up text-xs font-semibold uppercase tracking-[0.4em] text-red-500">
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
              className="animate-fade-up mt-5 max-w-xl text-base text-gray-300 sm:text-lg"
              style={{ animationDelay: '160ms' }}
            >
              Experience premium auto detailing with on-site mobile detailing in Austin. We come to you for Austin car cleaning, interior and exterior detailing, paint protection, and ceramic coatings. Schedule your appointment today.
            </p>
            <div
              className="animate-fade-up mt-8 flex flex-wrap gap-3"
              style={{ animationDelay: '240ms' }}
            >
              <Link
                href="/auth"
                className="btn-primary press inline-block rounded-lg px-6 py-3 text-sm font-semibold"
              >
                Book Mobile Detailing →
              </Link>
              <Link
                href="/auth"
                className="press inline-block rounded-lg border border-white/30 bg-black/30 px-6 py-3 text-sm font-medium text-white backdrop-blur hover:bg-black/50"
              >
                Sign In
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Services */}
      <section className="relative z-10 mx-auto w-full max-w-5xl px-6 py-16">
        <div className="reveal-on-scroll">
          <h2 className="h-accent text-2xl font-bold uppercase tracking-wider sm:text-3xl">
            Services
          </h2>
          <p className="mt-3 text-gray-400">
            Every package is tailored to your vehicle. We come to you — no driving across town, no waiting rooms.
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
              <p className="mt-2 text-sm text-gray-400">{s.description}</p>
            </div>
          ))}
        </div>
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
              <p className="text-3xl font-bold text-red-500">{r.headline}</p>
              <h3 className="mt-3 text-base font-semibold text-white">{r.title}</h3>
              <p className="mt-2 text-sm text-gray-400">{r.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="relative z-10 mx-auto w-full max-w-5xl px-6 pb-20">
        <div
          className="lift-hover relative overflow-hidden rounded-3xl border border-white/10 reveal-on-scroll"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={BOOK_CTA_IMAGE.src}
            alt={BOOK_CTA_IMAGE.alt}
            className="absolute inset-0 h-full w-full object-cover animate-banner-pan"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/65 to-black/30" />
          <div className="relative flex flex-col items-start gap-4 p-10 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.35em] text-red-500">
                Ready when you are
              </p>
              <h3 className="mt-2 text-2xl font-bold text-white sm:text-3xl">
                Mobile Detailing in Austin
              </h3>
              <p className="mt-2 max-w-xl text-sm text-gray-300">
                Quality, convenient on-site detailing brought to you. Pick a slot that works, we&apos;ll show up with everything we need. Pay a $30 deposit on approval — the rest on-site. Book now for mobile detailing in Austin.
              </p>
            </div>
            <Link
              href="/auth"
              className="btn-primary press inline-block shrink-0 rounded-lg px-6 py-3 text-sm font-semibold"
            >
              Get Started →
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/10 px-6 py-8">
        <div className="mx-auto flex w-full max-w-5xl flex-col items-center justify-between gap-3 text-xs text-gray-500 sm:flex-row">
          <p>© {new Date().getFullYear()} Austin Auto Detail. Mobile detailing in Austin, TX.</p>
          <p>
            <Link href="/auth" className="hover:text-gray-300">Sign in</Link>
            <span className="px-2">·</span>
            <Link href="/auth" className="hover:text-gray-300">Book a detail</Link>
          </p>
        </div>
      </footer>
    </main>
  );
}

const SERVICES = [
  {
    icon: '🚗',
    title: 'Interior + Exterior Detailing',
    description: 'Full vehicle deep clean — vacuum, shampoo, wash, decontaminate, and dress every surface inside and out.',
  },
  {
    icon: '✨',
    title: 'Ceramic Coating',
    description: 'Premium clear coat that lasts up to 10 years. Adds gloss and protects paint from UV, water spots, and contaminants.',
  },
  {
    icon: '🪞',
    title: 'Paint Correction',
    description: 'One- or two-step paint correction to remove swirl marks, oxidation, and minor scratches. Restores depth and clarity.',
  },
  {
    icon: '🛡️',
    title: '6-Month Wax',
    description: 'Long-lasting wax application for daily protection from sun, rain, and road grime — without committing to a coating.',
  },
  {
    icon: '🧽',
    title: 'Engine Bay + Stain Removal',
    description: 'Deep degrease the engine bay, lift stubborn upholstery stains, condition leather, treat windshields, and more.',
  },
  {
    icon: '📍',
    title: 'Mobile — We Come To You',
    description: 'Driveway, office parking lot, garage — anywhere in the Austin area. Three slots a day so you get our full attention.',
  },
];

const REASONS = [
  {
    headline: 'Mobile',
    title: 'No driving, no waiting',
    description: 'We bring the studio to your driveway. Get back hours of your week.',
  },
  {
    headline: 'Quality',
    title: 'Quality over quantity',
    description: 'Three details a day max. Your car gets focus and care, not assembly-line speed.',
  },
  {
    headline: '10 yrs',
    title: 'Ceramic coatings that last',
    description: 'Premium products and patient prep. Our ceramic coatings hold up for years — not months.',
  },
];
