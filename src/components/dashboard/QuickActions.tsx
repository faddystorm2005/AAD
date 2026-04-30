'use client';

import Link from 'next/link';

interface Action {
  label: string;
  description: string;
  icon: string;
  onClick?: () => void;
  href?: string;
  accent?: 'red' | 'neutral';
}

interface Props {
  onBook: () => void;
  onAddVehicle: () => void;
}

/**
 * Big tap-friendly action grid for the dashboard. Replaces a wall of small
 * buttons with four large hover-lift tiles that feel like cards in a
 * dashboard app. Touch-target sized for mobile.
 */
export default function QuickActions({ onBook, onAddVehicle }: Props) {
  const actions: Action[] = [
    {
      label: 'Book a Detail',
      description: 'Pick a slot, we come to you.',
      icon: '🚗',
      onClick: onBook,
      accent: 'red',
    },
    {
      label: 'Add a Vehicle',
      description: 'Save it to your garage.',
      icon: '➕',
      onClick: onAddVehicle,
    },
    {
      label: 'Account Settings',
      description: 'Profile, contact, history.',
      icon: '⚙️',
      href: '/settings',
    },
    {
      label: 'View Services',
      description: 'Packages, pricing, FAQ.',
      icon: '✨',
      href: '/#services',
    },
  ];

  return (
    <div
      className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4"
      role="group"
      aria-label="Quick actions"
    >
      {actions.map((a, i) => (
        <ActionTile key={a.label} action={a} delayMs={i * 70} />
      ))}
    </div>
  );
}

function ActionTile({ action, delayMs }: { action: Action; delayMs: number }) {
  const isRed = action.accent === 'red';
  const baseClasses = `glass-card lift-hover animate-fade-up group relative overflow-hidden rounded-2xl p-5 text-left transition-all ${
    isRed ? 'ring-1 ring-red-500/30' : ''
  }`;
  const inner = (
    <>
      {/* Soft glow behind the icon, brighter on hover. */}
      <div
        aria-hidden
        className={`pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full blur-2xl transition-opacity duration-300 ${
          isRed ? 'bg-red-500/30' : 'bg-white/10'
        } opacity-50 group-hover:opacity-90`}
      />
      <div className="relative flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-black/40 text-2xl shadow-inner transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6">
        {action.icon}
      </div>
      <div className="relative mt-4 text-lg font-bold text-white">
        {action.label}
      </div>
      <div className="relative mt-1 text-sm text-gray-300">{action.description}</div>
      <div className="relative mt-4 inline-flex items-center gap-1 text-sm font-semibold uppercase tracking-wider text-red-300 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
        Open <span className="transition-transform group-hover:translate-x-0.5">→</span>
      </div>
    </>
  );

  if (action.href) {
    return (
      <Link
        href={action.href}
        className={baseClasses}
        style={{ animationDelay: `${delayMs}ms` }}
      >
        {inner}
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={action.onClick}
      className={`${baseClasses} text-left`}
      style={{ animationDelay: `${delayMs}ms` }}
    >
      {inner}
    </button>
  );
}
