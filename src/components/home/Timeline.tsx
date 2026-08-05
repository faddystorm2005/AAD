'use client';

import { useEffect, useRef, useState } from 'react';

interface Step {
  number: string;
  title: string;
  description: string;
  icon: 'calendar' | 'clipboard' | 'van';
}

const STEPS: Step[] = [
  {
    number: 'Step 1',
    title: 'Pick a slot',
    icon: 'calendar',
    description:
      '9 AM, 1 PM, or 5 PM, any day. Real-time availability. No calls, no back-and-forth.',
  },
  {
    number: 'Step 2',
    title: 'We confirm',
    icon: 'clipboard',
    description:
      'Signature Mobile Detailing reviews your booking within 24 hours. No charge until we approve.',
  },
  {
    number: 'Step 3',
    title: 'We come to you',
    icon: 'van',
    description:
      "On the day of service, our team arrives at your address with everything we need. Our van is fully self-contained: we bring our own water and power. You don't move a thing.",
  },
];

function StepIcon({ name }: { name: Step['icon'] }) {
  const common = {
    width: 28,
    height: 28,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
  };
  if (name === 'calendar') {
    return (
      <svg {...common}>
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <path d="M16 2v4M8 2v4M3 10h18" />
      </svg>
    );
  }
  if (name === 'clipboard') {
    return (
      <svg {...common}>
        <rect x="6" y="4" width="12" height="18" rx="2" />
        <path d="M9 4V2h6v2" />
        <path d="M9 13l2 2 4-4" />
      </svg>
    );
  }
  // van
  return (
    <svg {...common}>
      <path d="M3 7h11v10H3z" />
      <path d="M14 10h4l3 4v3h-7" />
      <circle cx="7" cy="18" r="2" />
      <circle cx="17" cy="18" r="2" />
    </svg>
  );
}

export default function Timeline() {
  const rootRef = useRef<HTMLOListElement>(null);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  const toggle = (i: number) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(i) ? next.delete(i) : next.add(i);
      return next;
    });

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      root.querySelectorAll('.aad-step').forEach((el) => el.classList.add('is-active'));
      return;
    }

    const items = Array.from(root.querySelectorAll<HTMLElement>('.aad-step'));
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-active');
          }
        });
      },
      { threshold: 0.5 }
    );

    items.forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, []);

  return (
    <ol
      ref={rootRef}
      className="aad-timeline relative grid grid-cols-1 gap-8 sm:grid-cols-3 sm:gap-0"
      aria-label="How booking works in three steps"
    >
      {STEPS.map((step, i) => (
        <li
          key={step.title}
          className="aad-step relative flex flex-col items-center text-center sm:items-start sm:text-left"
        >
          {/* Connector to the next step. Hidden on the last item AND on
              mobile (where steps stack vertically and a center-line would
              run through the centered title/description text). On desktop
              the connector is a horizontal line between icons; the filled
              state animates via the .is-active class. */}
          {i < STEPS.length - 1 && (
            <span className="aad-connector pointer-events-none absolute hidden sm:block" aria-hidden />
          )}
          <div className="aad-step-icon relative z-10 flex h-14 w-14 items-center justify-center rounded-full border border-gold-500/40 bg-zinc-950 text-gold-400 transition-colors duration-500">
            <StepIcon name={step.icon} />
          </div>
          <p className="mt-4 text-xs font-semibold uppercase tracking-[0.25em] text-gold-400">
            {step.number}
          </p>
          <h3 className="mt-2 text-lg font-bold text-white sm:text-xl">{step.title}</h3>
          <button
            type="button"
            onClick={() => toggle(i)}
            aria-expanded={expanded.has(i)}
            className="mt-2 flex items-center gap-1.5 text-sm text-gray-300 hover:text-gray-200 transition-colors"
          >
            <span className={`text-lg leading-none transition-transform duration-200 ${expanded.has(i) ? 'rotate-45' : ''}`} aria-hidden>+</span>
            <span>{expanded.has(i) ? 'Hide' : 'Learn more'}</span>
          </button>
          {expanded.has(i) && (
            <p className="mt-2 max-w-xs text-base leading-relaxed text-gray-200 sm:max-w-[18rem]">
              {step.description}
            </p>
          )}
        </li>
      ))}
    </ol>
  );
}
