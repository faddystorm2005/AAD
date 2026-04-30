'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

/**
 * Floating "Book Now" pill that fades in once the visitor scrolls past the
 * hero (~600px). Always-visible CTA on long pages, doesn't fight the
 * sticky header. Hidden on the auth page so it doesn't double up.
 */
export default function StickyBookCta() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 600);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <Link
      href="/auth"
      aria-label="Book mobile detailing"
      className={`btn-primary press fixed bottom-5 right-5 z-40 rounded-full px-5 py-3 text-sm font-semibold shadow-2xl shadow-red-900/40 transition-all duration-300 sm:bottom-8 sm:right-8 ${
        visible
          ? 'translate-y-0 opacity-100'
          : 'pointer-events-none translate-y-4 opacity-0'
      }`}
    >
      🚗 Book Now
    </Link>
  );
}
