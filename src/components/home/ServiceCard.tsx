'use client';

import { useState, type ReactNode } from 'react';
import Link from 'next/link';
import TiltCard from './TiltCard';

interface ServiceCardProps {
  icon: ReactNode;
  title: string;
  description: string;
  priceLabel?: string;
}

export default function ServiceCard({ icon, title, description, priceLabel }: ServiceCardProps) {
  const [open, setOpen] = useState(false);

  return (
    <TiltCard className="glass-card rounded-2xl p-6">
      <div className="flex h-12 w-12 items-center justify-center rounded-full border border-red-500/40 bg-red-500/10 text-red-300">
        {icon}
      </div>
      <h3 className="mt-4 text-lg font-bold text-white">{title}</h3>
      {priceLabel ? (
        <p className="mt-1.5 text-sm font-semibold uppercase tracking-wider text-red-300">
          {priceLabel}
        </p>
      ) : null}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="mt-3 flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-200 transition-colors"
      >
        <span className={`text-lg leading-none transition-transform duration-200 ${open ? 'rotate-45' : ''}`} aria-hidden>+</span>
        <span>{open ? 'Hide details' : 'What\'s included'}</span>
      </button>
      {open && (
        <p className="mt-2 text-base leading-relaxed text-gray-200">{description}</p>
      )}
      <Link
        href="/auth"
        className="mt-4 inline-flex text-sm font-semibold uppercase tracking-wider text-red-300 hover:text-red-200"
      >
        Book this service →
      </Link>
    </TiltCard>
  );
}
