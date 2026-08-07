'use client';

import { useMemo, useState } from 'react';
import {
  phoenixMonthKey,
  phoenixMonthKeyAgo,
  phoenixMonthLabel,
} from '@/lib/phoenixTime';

import {
  PAYMENT_METHODS,
  PAYMENT_METHOD_LABELS,
  type PaymentMethod,
} from '@/lib/payments';

/** Only the fields this panel needs, so it works with any booking shape. */
export interface PaidBooking {
  paid_at: string | null;
  paid_amount: number | null;
  payment_method: PaymentMethod | null;
}

interface Props {
  bookings: PaidBooking[];
}

function money(n: number): string {
  return n.toLocaleString(undefined, {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

interface MonthTotals {
  total: number;
  jobs: number;
  byMethod: Record<PaymentMethod, number>;
}

function emptyTotals(): MonthTotals {
  return {
    total: 0,
    jobs: 0,
    byMethod: { cash: 0, card: 0, venmo: 0, zelle: 0, other: 0 },
  };
}

/**
 * What Alex has actually collected, bucketed by Phoenix calendar month.
 *
 * Reads the payments recorded through /api/admin/mark-paid (paid_at,
 * paid_amount, payment_method). It deliberately does NOT use booking totals:
 * a quote is what was asked for, not what was received, and the two differ
 * whenever add-ons get done on the spot or Alex gives a discount in person.
 *
 * Computed from the bookings the admin page already loaded, so it costs no
 * extra query.
 */
export default function CollectedSummary({ bookings }: Props) {
  const [showMethods, setShowMethods] = useState(false);

  const thisMonthKey = phoenixMonthKeyAgo(0);
  const lastMonthKey = phoenixMonthKeyAgo(1);

  const { thisMonth, lastMonth, allTime, allTimeJobs } = useMemo(() => {
    const buckets: Record<string, MonthTotals> = {
      [thisMonthKey]: emptyTotals(),
      [lastMonthKey]: emptyTotals(),
    };
    let total = 0;
    let jobs = 0;

    for (const b of bookings) {
      if (!b.paid_at) continue;
      const amount = Number(b.paid_amount ?? 0);
      if (!Number.isFinite(amount)) continue;

      total += amount;
      jobs += 1;

      const key = phoenixMonthKey(b.paid_at);
      const bucket = buckets[key];
      if (!bucket) continue; // outside the two months we report on

      bucket.total += amount;
      bucket.jobs += 1;
      if (b.payment_method) bucket.byMethod[b.payment_method] += amount;
    }

    return {
      thisMonth: buckets[thisMonthKey],
      lastMonth: buckets[lastMonthKey],
      allTime: total,
      allTimeJobs: jobs,
    };
  }, [bookings, thisMonthKey, lastMonthKey]);

  const diff = thisMonth.total - lastMonth.total;
  const methodsWithMoney = PAYMENT_METHODS.filter((m) => thisMonth.byMethod[m] > 0);

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-300">
        Collected
      </h2>

      <p className="mt-3 text-3xl font-bold text-white sm:text-4xl">
        {money(thisMonth.total)}
      </p>
      <p className="mt-1 text-base text-gray-200">
        {phoenixMonthLabel(thisMonthKey)}, {thisMonth.jobs}{' '}
        {thisMonth.jobs === 1 ? 'job' : 'jobs'} paid
      </p>

      <div className="mt-3 space-y-1 text-base text-gray-200">
        <p>
          {phoenixMonthLabel(lastMonthKey)}: {money(lastMonth.total)}
          {lastMonth.jobs > 0 && (
            <span className="text-gray-300">
              {' '}
              ({lastMonth.jobs} {lastMonth.jobs === 1 ? 'job' : 'jobs'})
            </span>
          )}
        </p>
        {lastMonth.total > 0 && (
          <p className={diff >= 0 ? 'text-green-400' : 'text-yellow-300'}>
            {diff >= 0 ? 'Up' : 'Down'} {money(Math.abs(diff))} vs last month
          </p>
        )}
      </div>

      {methodsWithMoney.length > 0 && (
        <>
          <button
            type="button"
            onClick={() => setShowMethods((v) => !v)}
            aria-expanded={showMethods}
            className="mt-3 rounded-lg border border-gray-600 px-4 py-3 text-base font-medium text-gray-200 transition-colors hover:bg-gray-800"
          >
            {showMethods ? 'Hide breakdown' : 'How they paid'}
          </button>

          {showMethods && (
            <ul className="mt-3 space-y-1 text-base text-gray-200">
              {methodsWithMoney.map((m) => (
                <li key={m} className="flex justify-between border-b border-white/5 pb-1">
                  <span>{PAYMENT_METHOD_LABELS[m]}</span>
                  <span className="font-medium text-white">
                    {money(thisMonth.byMethod[m])}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      <p className="mt-3 text-sm text-gray-300">
        All time: {money(allTime)} across {allTimeJobs}{' '}
        {allTimeJobs === 1 ? 'job' : 'jobs'}.
      </p>

      {allTimeJobs === 0 && (
        <p className="mt-2 text-sm text-gray-300">
          Nothing recorded yet. Open a finished booking and tap Mark as paid to
          start tracking.
        </p>
      )}
    </div>
  );
}
