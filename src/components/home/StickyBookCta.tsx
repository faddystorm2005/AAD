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
    <div
      className={`fixed fixed-safe-bottom-right z-40 transition-all duration-300 ${
        visible ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-4 opacity-0'
      }`}
    >
      {/* Pulse ring sits behind the button: scale+opacity only (composited) */}
      <div className="book-cta-ring" aria-hidden="true" />
      <Link
        href="/auth"
        aria-label="Book mobile detailing"
        className="book-cta-pill btn-primary relative flex items-center gap-2 rounded-full px-6 py-4 text-base font-semibold shadow-2xl shadow-red-900/40 sm:text-lg"
      >
        {/* Shimmer sweep: translateX only (composited) */}
        <span className="book-cta-shine" aria-hidden="true" />
        🚗 Book Now
      </Link>
    </div>
  );
}
