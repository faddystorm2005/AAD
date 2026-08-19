import Link from 'next/link';

/**
 * Site footer, extracted verbatim from the homepage so the city landing
 * pages share the exact same look. `availability` is the portal-editable
 * availability line (the caller fetches it via getLiveContent).
 * `anchorBase` prefixes the section anchor links: '' on the homepage,
 * '/' on other pages so they lead back to the homepage sections.
 */
export default function SiteFooter({
  availability,
  anchorBase = '',
}: {
  availability: string;
  anchorBase?: string;
}) {
  return (
    <footer className="relative z-10 border-t border-white/10 px-6 py-12">
      <div className="mx-auto grid w-full max-w-5xl gap-8 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <p className="text-base font-bold uppercase tracking-[0.18em] text-white">
            Signature Mobile Detailing
          </p>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-gray-300 italic">
            <span aria-hidden>✝</span> Faith-driven, owner-operated
          </p>
          <p className="mt-3 text-base text-gray-200">
            Mobile detailing in Phoenix, AZ and across the valley. Quality over quantity. We come to you for interior, exterior, ceramic coatings, paint correction, and more.
          </p>
          <p className="mt-4 text-base text-gray-200">
            <span className="text-base text-gray-300">Alex</span>{' '}
            <a href="tel:+14807933782" className="font-semibold text-gold-300 underline-offset-4 hover:underline">
              (480) 793-3782
            </a>
          </p>
          <p className="mt-1 text-base text-gray-200">
            <span className="text-base text-gray-300">Kane</span>{' '}
            <a href="tel:+16028815602" className="font-semibold text-gold-300 underline-offset-4 hover:underline">
              (602) 881-5602
            </a>
          </p>
          <p className="mt-2 text-base text-gray-200">
            <a href="mailto:info@signaturemobiledetailaz.com" className="font-semibold text-gold-300 underline-offset-4 hover:underline">
              info@signaturemobiledetailaz.com
            </a>
          </p>
          <p className="mt-2 text-sm text-gray-300">
            {availability}
          </p>
        </div>
        <nav aria-label="Services">
          <p className="text-sm font-semibold uppercase tracking-wider text-gray-300">
            Services
          </p>
          <ul className="mt-3 space-y-2 text-base text-gray-200">
            <li><a href={`${anchorBase}#services`} className="hover:text-white">Mobile Detailing</a></li>
            <li><a href={`${anchorBase}#services`} className="hover:text-white">Ceramic Coating</a></li>
            <li><a href={`${anchorBase}#services`} className="hover:text-white">Paint Correction</a></li>
            <li><a href={`${anchorBase}#services`} className="hover:text-white">Car Cleaning</a></li>
          </ul>
        </nav>
        <nav aria-label="Site">
          <p className="text-sm font-semibold uppercase tracking-wider text-gray-300">
            Site
          </p>
          <ul className="mt-3 space-y-2 text-base text-gray-200">
            <li><a href={`${anchorBase}#main-content`} className="hover:text-white">Home</a></li>
            <li><a href={`${anchorBase}#pricing`} className="hover:text-white">Pricing</a></li>
            <li><a href={`${anchorBase}#recent-work`} className="hover:text-white">Recent Work</a></li>
            <li><a href={`${anchorBase}#how-it-works`} className="hover:text-white">How It Works</a></li>
            <li><a href={`${anchorBase}#faq`} className="hover:text-white">FAQ</a></li>
            <li><a href={`${anchorBase}#contact`} className="hover:text-white">Contact</a></li>
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
        <p>
          © {new Date().getFullYear()} Signature Mobile Detailing. Mobile detailing in Phoenix, AZ.
          {/* Kept visually secondary so the old brand does not compete with
              the new one. De-emphasis comes from size and weight only, not
              from dimming the text: this line exists for returning customers
              who know the old name, and that group skews older, so it has to
              stay readable. The structured-data equivalent lives in
              layout.tsx as alternateName. */}
          <span className="mt-1 block text-sm text-gray-300">
            Formerly Austin Auto Detail.
          </span>
        </p>
        <p className="text-sm text-gray-300 italic text-center sm:text-right">
          <span aria-hidden className="mr-1.5 text-gray-500">✝</span>
          &ldquo;Whatever you do, work at it with all your heart, as working for the Lord.&rdquo; &middot; Col. 3:23
        </p>
        <p className="text-sm text-gray-300">
          Site by{" "}
          <a
            href="https://www.mausandco.com"
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-4 hover:text-white"
          >
            Maus &amp; Co.
          </a>
        </p>
      </div>
    </footer>
  );
}
