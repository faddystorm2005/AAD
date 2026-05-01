'use client';

interface Stat {
  value: number | string;
  suffix?: string;
  prefix?: string;
  label: string;
}

// Stats mix the three things customers care about: convenience, price/value,
// and quality. Real numbers, no animation, so SSR and slow phones never show
// placeholder zeros to users or search crawlers.
const STATS: Stat[] = [
  { value: 100, suffix: '+', label: 'Trusted Austin Customers' },
  { value: 3, suffix: '/day', label: 'Cars Max - No Rush Jobs' },
  { value: '5.0', suffix: '★', label: 'Average Customer Rating' },
  { value: 100, suffix: '%', label: 'Showroom-Ready, Guaranteed' },
];

export default function StatsStrip() {
  return (
    <div
      className="grid grid-cols-2 gap-6 sm:grid-cols-4"
      role="list"
      aria-label="Austin Auto Detail by the numbers"
    >
      {STATS.map((s, i) => (
        <StatTile key={s.label} stat={s} index={i} />
      ))}
    </div>
  );
}

function StatTile({ stat, index }: { stat: Stat; index: number }) {
  return (
    <div
      role="listitem"
      className="text-center animate-fade-up"
      style={{ animationDelay: `${index * 80}ms` }}
    >
      <div className="text-3xl font-bold sm:text-4xl">
        <span className="text-gradient-hero">
          {stat.prefix ?? ''}
          {stat.value}
          {stat.suffix ?? ''}
        </span>
      </div>
      <div className="mt-3 text-xs uppercase tracking-[0.2em] text-gray-200 sm:text-sm">
        {stat.label}
      </div>
    </div>
  );
}
