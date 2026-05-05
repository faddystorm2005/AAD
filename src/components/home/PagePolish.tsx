'use client';

import { useEffect } from 'react';

/**
 * Mounts two passive observers that add interactive polish:
 * 1. Card hover spotlight: tracks cursor position as CSS vars on each .glass-card
 * 2. Active nav highlighting: marks the current section's nav link with .nav-active
 */
export default function PagePolish() {
  useEffect(() => {
    // ── Card spotlight ────────────────────────────────────────────────────
    const cards = document.querySelectorAll<HTMLElement>('.glass-card');
    const handlers: Array<[HTMLElement, (e: MouseEvent) => void]> = [];
    cards.forEach((card) => {
      const onMove = (e: MouseEvent) => {
        const rect = card.getBoundingClientRect();
        card.style.setProperty('--mx', `${e.clientX - rect.left}px`);
        card.style.setProperty('--my', `${e.clientY - rect.top}px`);
      };
      card.addEventListener('mousemove', onMove, { passive: true });
      handlers.push([card, onMove]);
    });

    // ── Active nav highlight ──────────────────────────────────────────────
    const sections = document.querySelectorAll<HTMLElement>('section[id]');
    const navLinks = document.querySelectorAll<HTMLAnchorElement>('header nav a[href^="#"]');

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const id = entry.target.id;
          navLinks.forEach((link) => {
            const matches = link.getAttribute('href') === `#${id}`;
            link.classList.toggle('nav-active', matches);
          });
        });
      },
      { rootMargin: '-25% 0px -65% 0px' }
    );
    sections.forEach((s) => observer.observe(s));

    return () => {
      handlers.forEach(([card, fn]) => card.removeEventListener('mousemove', fn));
      observer.disconnect();
    };
  }, []);

  return null;
}
