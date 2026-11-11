'use client';

import { useState, type ReactNode } from 'react';
import Link from 'next/link';
import TiltCard from './TiltCard';
import TextLines from '@/components/TextLines';

interface ServiceCardProps {
  icon: ReactNode;
  title: string;
  description: string;
  priceLabel?: string;
  detailsLabel?: string;
  hideLabel?: string;
  bookLabel?: string;
}

export default function ServiceCard({
  icon,
  title,
  description,
  priceLabel,
  detailsLabel = "What's included",
  hideLabel = 'Hide details',
  bookLabel = 'Book this service →',
}: ServiceCardProps) {
  const [open, setOpen] = useState(false);

  return (
    <TiltCard className="glass-card rounded-2xl p-6">
      <div className="flex h-12 w-12 items-center justify-center rounded-full border border-gold-500/40 bg-gold-500/10 text-gold-300">
        {icon}
      </div>
      {title ? <h3 className="mt-4 text-lg font-bold text-white">{title}</h3> : null}
      {priceLabel ? (
        <p className="mt-1.5 text-sm font-semibold uppercase tracking-wider text-gold-300">
          {priceLabel}
        </p>
      ) : null}
      {description ? (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="mt-3 flex items-center gap-1.5 text-sm text-gray-300 hover:text-gray-200 transition-colors"
        >
          <span className={`text-lg leading-none transition-transform duration-200 ${open ? 'rotate-45' : ''}`} aria-hidden>+</span>
          <span>{open ? hideLabel : detailsLabel}</span>
        </button>
      ) : null}
      {open && description && (
        <p className="mt-2 text-base leading-relaxed text-gray-200"><TextLines text={description} /></p>
      )}
      <Link
        href="/auth"
        className="mt-4 inline-flex text-sm font-semibold uppercase tracking-wider text-gold-300 hover:text-gold-200"
      >
        {bookLabel}
      </Link>
    </TiltCard>
  );
}
