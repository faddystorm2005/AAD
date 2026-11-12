import Link from 'next/link';
import Image from 'next/image';
import HomeNavAccountLink from '@/components/HomeNavAccountLink';
import MobileNav from '@/components/home/MobileNav';
import type { Copy } from '@/lib/cmsContent';

/**
 * Sticky site header, extracted verbatim from the homepage so the city
 * landing pages share the exact same look. `anchorBase` prefixes the
 * section anchor links: '' on the homepage (same-page scroll, unchanged
 * behavior), '/' on other pages so the links lead back to the homepage
 * sections instead of pointing at anchors that do not exist there.
 */
export default function SiteHeader({ anchorBase = '', copy }: { anchorBase?: string; copy: Copy }) {
  const phone = copy.phone('contact.alex_phone');
  return (
    // Sticks to the top of the page scroll. That only works while no ancestor
    // is a scroll container: the page <main> must use overflow-x-clip, never
    // overflow-hidden. Solid background so the page never reads through it.
    <header className="site-header-safe-top sticky top-0 z-50 border-b border-white/10 bg-black">
      <nav
        className="mx-auto flex w-full max-w-5xl items-center justify-between gap-2 px-4 py-4 sm:gap-4 sm:px-6"
        aria-label="Primary"
      >
        <Link
          href="/"
          className="flex shrink-0 items-center gap-2"
          aria-label="Signature Mobile Detailing home"
        >
          <Image
            src="/images/aad/logo.png"
            alt="Signature Mobile Detailing"
            width={512}
            height={512}
            priority
            className="h-12 w-12 sm:h-14 sm:w-14"
          />
        </Link>
        <ul className="hidden list-none items-center gap-6 p-0 text-base font-medium text-gray-100 sm:flex">
          <li><a href={`${anchorBase}#services`} className="hover:text-gold-300">Services</a></li>
          <li><a href={`${anchorBase}#pricing`} className="hover:text-gold-300">Pricing</a></li>
          <li><a href={`${anchorBase}#recent-work`} className="hover:text-gold-300">Work</a></li>
          <li><a href={`${anchorBase}#how-it-works`} className="hover:text-gold-300">How It Works</a></li>
          <li><a href={`${anchorBase}#faq`} className="hover:text-gold-300">FAQ</a></li>
          <li><a href={`${anchorBase}#contact`} className="hover:text-gold-300">Contact</a></li>
        </ul>
        <div className="flex items-center gap-3 sm:gap-4">
          <a
            href={phone.href}
            className="flex min-h-11 min-w-11 items-center justify-center gap-1.5 font-semibold text-gold-300 hover:text-gold-200"
            aria-label={`Call us at ${phone.display}`}
          >
            <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.8a19.79 19.79 0 01-3.07-8.68A2 2 0 012 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 14.92v2z" />
            </svg>
            <span className="hidden text-sm sm:inline">{phone.display}</span>
          </a>
          {/* Hidden on mobile: accessible via hamburger menu instead */}
          <div className="hidden sm:flex sm:items-center sm:gap-4">
            <HomeNavAccountLink />
            <Link
              href="/auth"
              className="btn-primary press shrink-0 rounded-lg px-5 py-2.5 text-base font-semibold"
            >
              {copy.text('header.book_label')}
            </Link>
          </div>
          <MobileNav anchorBase={anchorBase} />
        </div>
      </nav>
    </header>
  );
}
