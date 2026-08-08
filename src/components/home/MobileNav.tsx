'use client';

import { useEffect, useCallback, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import HomeNavAccountLink from '@/components/HomeNavAccountLink';
import { useIsHydrated } from '@/lib/useBrowserState';

const LINKS = [
  { href: '#services',    label: 'Services' },
  { href: '#pricing',     label: 'Pricing' },
  { href: '#recent-work', label: 'Our Work' },
  { href: '#how-it-works',label: 'How It Works' },
  { href: '#faq',         label: 'FAQ' },
  { href: '#contact',     label: 'Contact' },
];

export default function MobileNav() {
  const [open, setOpen] = useState(false);
  // The portal target only exists on the client, so gate on hydration.
  const mounted = useIsHydrated();
  const closeRef = useRef<HTMLButtonElement>(null);

  const close = useCallback(() => setOpen(false), []);
  const toggle = useCallback(() => setOpen((o) => !o), []);

  // ESC key closes the drawer
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, close]);

  // Body scroll-lock while open
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  // Focus the close button when drawer opens
  useEffect(() => {
    if (open) closeRef.current?.focus();
  }, [open]);

  return (
    <>
      {/* Hamburger button - mobile only.
          h-11 w-11 = 44px meets Apple HIG minimum tap target.
          Solid bg-zinc-800 ensures it's always visible on iOS Safari
          regardless of backdrop-filter stacking context quirks. */}
      <button
        type="button"
        onClick={toggle}
        className="mobile-nav-toggle flex h-11 w-11 items-center justify-center rounded-lg border border-white/30 bg-zinc-800 text-white sm:hidden"
        aria-label={open ? 'Close menu' : 'Open menu'}
        aria-expanded={open ? 'true' : 'false'}
        aria-controls="mobile-drawer"
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          aria-hidden="true"
        >
          {open ? (
            <path d="M6 6l12 12M18 6L6 18" />
          ) : (
            <path d="M3 6h18M3 12h18M3 18h18" />
          )}
        </svg>
      </button>

      {/* Drawer + backdrop rendered via portal to document.body so they
          escape the parent <header>'s backdrop-filter, which would
          otherwise contain `position: fixed` children to the header's
          bounding box (a known browser quirk). */}
      {mounted &&
        createPortal(
          <>
            {/* Backdrop */}
            {open && (
              <div
                className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm"
                aria-hidden="true"
                onClick={close}
              />
            )}

            {/* Slide-in drawer */}
            <div
              id="mobile-drawer"
              role="dialog"
              aria-modal="true"
              aria-label="Navigation menu"
              className={`fixed right-0 top-0 z-[101] flex h-full w-[min(360px,90vw)] flex-col border-l-2 border-gold-600/60 bg-zinc-900 shadow-[-8px_0_40px_rgba(0,0,0,0.8)] transition-transform duration-300 motion-reduce:transition-none ${
                open ? 'translate-x-0' : 'translate-x-full'
              }`}
            >
              {/* Drawer header */}
              <div className="flex items-center justify-between border-b border-white/10 bg-zinc-950 px-5 py-4">
                <span className="text-sm font-semibold uppercase tracking-[0.2em] text-gold-400">
                  Menu
                </span>
                <button
                  ref={closeRef}
                  type="button"
                  onClick={close}
                  className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/30 bg-zinc-800 text-white hover:bg-zinc-700"
                  aria-label="Close menu"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
                    <path d="M6 6l12 12M18 6L6 18" />
                  </svg>
                </button>
              </div>

              {/* Nav links */}
              <nav aria-label="Mobile navigation" className="flex-1 overflow-y-auto px-4 py-6">
                <ul className="flex flex-col gap-1">
                  {LINKS.map(({ href, label }) => (
                    <li key={href}>
                      <a
                        href={href}
                        onClick={close}
                        className="block rounded-xl px-4 py-3.5 text-base font-medium text-gray-100 transition-colors hover:bg-white/10 hover:text-gold-300 active:bg-white/15"
                      >
                        {label}
                      </a>
                    </li>
                  ))}
                </ul>

                <div className="mt-6 space-y-3 border-t border-white/10 pt-6">
                  <div onClick={close}>
                    <HomeNavAccountLink />
                  </div>
                  <Link
                    href="/auth"
                    onClick={close}
                    className="btn-primary press block rounded-xl px-4 py-3.5 text-center text-base font-semibold"
                  >
                    Book Now →
                  </Link>
                  <a
                    href="tel:+14807933782"
                    className="block text-center text-sm text-gray-300 hover:text-gold-300"
                  >
                    (480) 793-3782
                  </a>
                </div>
              </nav>
            </div>
          </>,
          document.body
        )}
    </>
  );
}
