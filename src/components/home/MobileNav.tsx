'use client';

import { useState } from 'react';
import Link from 'next/link';
import HomeNavAccountLink from '@/components/HomeNavAccountLink';

const LINKS = [
  { href: '#services', label: 'Services' },
  { href: '#pricing', label: 'Pricing' },
  { href: '#recent-work', label: 'Our Work' },
  { href: '#how-it-works', label: 'How It Works' },
  { href: '#faq', label: 'FAQ' },
  { href: '#contact', label: 'Contact' },
];

export default function MobileNav() {
  const [open, setOpen] = useState(false);

  return (
    <div className="sm:hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="press flex h-9 w-9 items-center justify-center rounded-lg border border-white/20 bg-black/40 text-white"
        aria-label={open ? 'Close menu' : 'Open menu'}
        aria-expanded={open ? 'true' : 'false'}
      >
        {open ? (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
            <path d="M3 6h18M3 12h18M3 18h18" />
          </svg>
        )}
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full z-50 border-b border-white/10 bg-black/95 px-6 py-4 backdrop-blur-md">
          <nav aria-label="Mobile navigation">
            <ul className="flex flex-col gap-1">
              {LINKS.map(({ href, label }) => (
                <li key={href}>
                  <a
                    href={href}
                    onClick={() => setOpen(false)}
                    className="block rounded-lg px-3 py-3 text-base font-medium text-gray-100 hover:bg-white/5 hover:text-red-300 active:bg-white/10"
                  >
                    {label}
                  </a>
                </li>
              ))}
            </ul>
            <div className="mt-4 space-y-2 border-t border-white/10 pt-4">
              <div onClick={() => setOpen(false)}>
                <HomeNavAccountLink />
              </div>
              <Link
                href="/auth"
                onClick={() => setOpen(false)}
                className="btn-primary press block rounded-lg px-4 py-3 text-center text-base font-semibold"
              >
                Book Now →
              </Link>
            </div>
          </nav>
        </div>
      )}
    </div>
  );
}
