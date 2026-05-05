'use client';

import { useEffect, useCallback, useRef, useState } from 'react';
import Link from 'next/link';
import HomeNavAccountLink from '@/components/HomeNavAccountLink';

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

      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm motion-reduce:transition-none"
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
        aria-hidden={open ? 'false' : 'true'}
        className={`fixed right-0 top-0 z-50 flex h-full w-[min(360px,85vw)] flex-col bg-zinc-950 shadow-2xl transition-transform duration-300 motion-reduce:transition-none ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Drawer header */}
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <span className="text-sm font-semibold uppercase tracking-[0.2em] text-gray-300">
            Menu
          </span>
          <button
            ref={closeRef}
            type="button"
            onClick={close}
            className="press flex h-9 w-9 items-center justify-center rounded-lg border border-white/20 bg-white/5 text-white hover:bg-white/10"
            aria-label="Close menu"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
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
                  className="block rounded-xl px-4 py-3.5 text-base font-medium text-gray-100 transition-colors hover:bg-white/5 hover:text-red-300 active:bg-white/10"
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
              className="block text-center text-sm text-gray-400 hover:text-red-300"
            >
              (480) 793-3782
            </a>
          </div>
        </nav>
      </div>
    </>
  );
}
