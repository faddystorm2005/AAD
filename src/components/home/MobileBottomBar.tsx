'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function MobileBottomBar() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 600);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (visible) {
      document.body.classList.add('has-bottom-bar');
    } else {
      document.body.classList.remove('has-bottom-bar');
    }
    return () => document.body.classList.remove('has-bottom-bar');
  }, [visible]);

  return (
    <div className={`mobile-bottom-bar${visible ? ' visible' : ''}`} aria-hidden={visible ? undefined : 'true'}>
      <a
        href="tel:+14807933782"
        className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 py-3 text-sm font-semibold text-white"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.8a19.79 19.79 0 01-3.07-8.68A2 2 0 012 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 14.92v2z" />
        </svg>
        Call
      </a>
      <Link
        href="/auth"
        className="btn-primary flex flex-1 items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold"
      >
        Book Now →
      </Link>
    </div>
  );
}
