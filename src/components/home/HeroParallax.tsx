'use client';
import { useEffect } from 'react';

export default function HeroParallax() {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    // Skip on touch devices — parallax causes scroll jank on mobile/low-end phones
    if (window.matchMedia('(hover: none) and (pointer: coarse)').matches) return;

    const wrap = document.querySelector<HTMLElement>('.hero-parallax-wrap');
    if (!wrap) return;

    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const y = window.scrollY;
        // iOS rubber-band guard + apply parallax shift
        if (y >= 0) {
          wrap.style.transform = `translate3d(0,${y * 0.38}px,0)`;
        }
        ticking = false;
      });
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return null;
}
