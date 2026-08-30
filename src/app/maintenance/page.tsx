import type { Metadata } from 'next';
import Image from 'next/image';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  // absolute, or the root layout's "%s · Signature Mobile Detailing" template
  // lands on top of a title that already names the business and a screen
  // reader announces it twice on load.
  title: { absolute: 'Quick tune-up in progress | Signature Mobile Detailing' },
  description: 'The website is down for a short update. We are still detailing today.',
  // Deliberately NO robots directive. The proxy rewrites without changing the
  // address, so anything set here is emitted on every real page of the site
  // for the length of the outage, and noindex there is the documented way to
  // have those pages dropped. Next adds a bare noindex of its own to any
  // non-200 render, which is enough and is not worth answering 200 to avoid.
};

// Says "website", on purpose. "We are making some improvements" reads as a
// business closed for renovations to someone standing next to a dirty truck.
const FALLBACK = 'Our website is down for a short update. We are still out detailing today.';

const OWNERS = [
  { name: 'Alex', display: '(480) 793-3782', tel: '+14807933782' },
  { name: 'Kane', display: '(602) 881-5602', tel: '+16028815602' },
];

export default async function MaintenancePage() {
  const h = await headers();

  // Reachable only through the proxy rewrite. Served directly while the site
  // is up, this page would be a 200 anyone could link as evidence that
  // Signature is offline. The proxy strips both headers on the way in, so this
  // cannot be forged.
  if (h.get('x-maintenance') !== '1') notFound();

  const raw = h.get('x-maintenance-message');
  let message = FALLBACK;
  if (raw) {
    try {
      const decoded = decodeURIComponent(raw).trim();
      if (decoded) message = decoded;
    } catch {
      // A malformed header should never cost the visitor the page.
    }
  }

  return (
    // id and tabIndex match the contract the rest of the site keeps. The
    // layout renders a "Skip to main content" link on every page, and without
    // this the first tab stop on the page went nowhere.
    <main
      id="main-content"
      tabIndex={-1}
      className="flex min-h-screen items-center justify-center bg-black px-6 py-16"
    >
      <div className="w-full max-w-xl text-center">
        <Image
          src="/images/aad/logo.png"
          alt="Signature Mobile Detailing"
          // The asset is square. Declaring 260x110 reserved the wrong box and
          // the whole page, including both phone links, jumped on load.
          width={384}
          height={384}
          priority
          className="mx-auto h-auto w-[min(200px,55%)]"
        />

        <p className="mt-8 text-sm font-bold uppercase tracking-[0.4em] text-gold-400">
          Quality over quantity
        </p>

        {/* rem, not px. At a 200% browser text setting the hardcoded version
            stayed at 30px while the body copy under it grew to 36px, so the
            heading ended up smaller than the paragraph. */}
        <h1 className="mt-4 text-[clamp(1.875rem,6vw,2.75rem)] font-bold uppercase leading-tight text-white">
          Quick tune-up in progress
        </h1>

        {/* The numbers come BEFORE the message. The message is free text the
            owners type, and a long one pushed both phone numbers below the
            fold on a phone, which defeats the only job this page has. */}
        <div className="mt-8 border-t border-white/15 pt-8">
          <p className="text-lg leading-relaxed text-gray-200">
            We are still booking details today. Call Alex or Kane and we will
            get you on the schedule.
          </p>

          <div className="mt-5 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-6">
            {OWNERS.map((o) => (
              <a
                key={o.tel}
                href={`tel:${o.tel}`}
                // Named explicitly. Composing the name from sibling text runs
                // inside an inline-flex box made Chrome join them without a
                // separator: "Call Alex(480) 793-3782".
                aria-label={`Call ${o.name} at ${o.display}`}
                className="inline-flex min-h-[48px] min-w-[44px] items-center justify-center rounded-full bg-gold-600 px-6 text-lg font-bold text-black"
              >
                <span aria-hidden="true">
                  {o.name}{' '}
                  {/* Or a 200% text setting breaks it as "793-" / "3782". */}
                  <span className="whitespace-nowrap">{o.display}</span>
                </span>
              </a>
            ))}
          </div>
        </div>

        {/* break-words because a pasted URL is one unbreakable token, and one
            of those made the page scroll sideways at 320px. */}
        <p className="mx-auto mt-8 max-w-[46ch] whitespace-pre-line break-words text-lg leading-relaxed text-gray-200 [overflow-wrap:anywhere]">
          {message}
        </p>
      </div>
    </main>
  );
}
