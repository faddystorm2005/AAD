import type { Metadata } from 'next';
import Image from 'next/image';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Quick tune-up in progress | Signature Mobile Detailing',
  description: 'The site is down for a short tune-up and will be back shortly.',
  // Deliberately NO robots directive. The proxy rewrites without changing the
  // address, so anything set here is emitted on every real page of the site
  // for the length of the outage, and noindex there is the documented way to
  // have those pages dropped. Next adds a bare noindex of its own to any
  // non-200 render, which is enough and is not worth answering 200 to avoid.
};

const FALLBACK = 'We are making some improvements and will be right back.';

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
    <main className="flex min-h-screen items-center justify-center bg-black px-6 py-16">
      <div className="w-full max-w-xl text-center">
        <Image
          src="/images/aad/logo.png"
          alt="Signature Mobile Detailing"
          width={260}
          height={110}
          priority
          className="mx-auto h-auto w-[min(260px,70%)]"
        />

        <h1 className="mt-10 text-[clamp(30px,6vw,44px)] font-semibold leading-tight text-white">
          Quick tune-up in progress
        </h1>

        <p className="mx-auto mt-5 max-w-[46ch] text-lg leading-relaxed text-gray-200">
          {message}
        </p>

        <div className="mt-10 border-t border-white/15 pt-8">
          <p className="text-lg leading-relaxed text-gray-200">
            Need a detail booked in the meantime? Give us a call.
          </p>

          <div className="mt-5 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-8">
            {OWNERS.map((o) => (
              <a
                key={o.tel}
                href={`tel:${o.tel}`}
                className="inline-flex min-h-[48px] min-w-[44px] items-center justify-center rounded-[10px] px-4 text-xl font-bold text-gold-300 underline underline-offset-4"
              >
                {/* Bold is load bearing. WCAG counts text as large at 18.66px
                    and up when it is bold, which drops the contrast floor from
                    4.5:1 to 3:1. Semibold does not qualify, which is what
                    caught out the same link on Tammy's site. */}
                <span className="sr-only">Call </span>
                {o.name} {o.display}
              </a>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
