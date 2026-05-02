'use client';

import { useEffect } from 'react';

/**
 * Watches elements with class scroll-card and adds is-revealed
 * when they enter the viewport. Uses data-stagger-i attribute
 * (0-based index) to stagger reveals within the same grid.
 * After the entrance transition completes, removes scroll-card
 * and is-revealed so glass-card/lift-hover transitions work normally.
 */
export default function ScrollCardObserver() {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const cards = document.querySelectorAll<HTMLElement>('.scroll-card');
    if (!cards.length) return;

    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const el = entry.target as HTMLElement;
          const i = Number(el.dataset.staggerI ?? 0);
          obs.unobserve(el);
          setTimeout(() => {
            el.classList.add('is-revealed');
            // Remove scroll-card after transition so hover styles (glass-card,
            // lift-hover) take over the transform/transition without conflict.
            setTimeout(() => {
              el.classList.remove('scroll-card', 'is-revealed');
            }, 620);
          }, i * 70);
        });
      },
      { threshold: 0.08, rootMargin: '0px 0px -30px 0px' }
    );

    cards.forEach((card) => obs.observe(card));
    return () => obs.disconnect();
  }, []);

  return null;
}
