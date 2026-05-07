'use client';

import { useEffect, useState } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabaseClient';
import {
  DayAvailability,
  perDayCapacity,
  perSlotCapacity,
  SLOT_LABELS,
  SLOT_TIMES,
} from '@/lib/slots';
import { todayAustinDateString } from '@/lib/austinTime';

interface Props {
  session: Session | null;
}

const DAYS_AHEAD = 14;

function formatDayLabel(date: string): string {
  // Noon UTC is always the same calendar date in Austin (6am or 7am local).
  const d = new Date(date + 'T12:00:00Z');
  return d.toLocaleDateString(undefined, {
    timeZone: 'America/Chicago',
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

export default function DailyCapacityPanel({ session }: Props) {
  const [days, setDays] = useState<DayAvailability[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingDay, setUpdatingDay] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const today = todayAustinDateString();
  const endDate = (() => {
    const d = new Date(today + 'T00:00:00Z');
    d.setUTCDate(d.getUTCDate() + DAYS_AHEAD - 1);
    return d.toISOString().slice(0, 10);
  })();

  const load = async () => {
    try {
      const res = await fetch(`/api/availability?from=${today}&to=${endDate}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed to load availability');
      setDays(data.days ?? []);
    } catch (err: any) {
      setError(err?.message ?? 'Load failed');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();

    // Refresh whenever bookings or daily_capacity change.
    const ch = supabase
      .channel('admin-daily-capacity')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'bookings' },
        () => load()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'daily_capacity' },
        () => load()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleDay = async (day: string, current: boolean) => {
    if (!session?.access_token) return;
    setUpdatingDay(day);
    setError(null);

    // Optimistic update - flip the help flag AND recompute per-day /
    // per-slot capacity so the UI numbers update instantly. Don't wait for
    // Supabase Realtime (often disabled on the daily_capacity table).
    const next = !current;
    const prev = days;
    setDays((list) =>
      list.map((d) => {
        if (d.date !== day) return d;
        const newPerDay = perDayCapacity(next);
        const newPerSlot = perSlotCapacity(next);
        return {
          ...d,
          isHelpAvailable: next,
          perDayCapacity: newPerDay,
          slots: d.slots.map((s) => ({
            ...s,
            perSlotCapacity: newPerSlot,
            // Recompute availableForRegular so the customer-facing slots
            // unlock immediately if more capacity is now allowed.
            availableForRegular:
              d.totalBookings < newPerDay &&
              s.takenCount < newPerSlot &&
              !(s.ceramicTaken),
          })),
        };
      })
    );

    try {
      const res = await fetch('/api/admin/capacity', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ day, isHelpAvailable: next }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Update failed');
      // Belt-and-suspenders: refresh from the server to pick up any
      // server-side derivations we didn't replicate locally.
      load();
    } catch (err: any) {
      // Roll back.
      setDays(prev);
      setError(err?.message ?? 'Update failed');
    } finally {
      setUpdatingDay(null);
    }
  };

  if (loading) {
    return <div className="h-32 animate-pulse rounded-lg bg-gray-800" />;
  }

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">Daily Capacity</h2>
        <p className="text-xs text-gray-300">
          Solo: {perDayCapacity(false)}/day, {perSlotCapacity(false)}/slot · Help:{' '}
          {perDayCapacity(true)}/day, {perSlotCapacity(true)}/slot
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-700 bg-red-900/40 p-3 text-sm text-red-200">
          {error}
        </div>
      )}

      <div className="space-y-2">
        {days.map((day) => {
          const isUpdating = updatingDay === day.date;
          return (
            <div
              key={day.date}
              className="flex items-center justify-between rounded-lg border border-gray-700 bg-gray-900 p-4"
            >
              <div>
                <p className="font-semibold text-white">{formatDayLabel(day.date)}</p>
                <p className="text-xs text-gray-300">
                  {day.totalBookings}/{day.perDayCapacity} booked
                  {day.ceramicBooked && ' · ceramic'}
                </p>
                <div className="mt-1 flex gap-2 text-[10px] uppercase tracking-wider text-gray-300">
                  {SLOT_TIMES.map((t) => {
                    const slot = day.slots.find((s) => s.time === t)!;
                    return (
                      <span
                        key={t}
                        className={`rounded px-1.5 py-0.5 ${
                          slot.takenCount > 0 ? 'bg-red-900/60 text-red-300' : 'bg-gray-800'
                        }`}
                      >
                        {SLOT_LABELS[t]} {slot.takenCount}/{slot.perSlotCapacity}
                      </span>
                    );
                  })}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className={`text-xs font-semibold uppercase tracking-wider ${
                    day.isHelpAvailable ? 'text-red-400' : 'text-gray-300'
                  }`}>
                    {day.isHelpAvailable ? 'Help on' : 'Solo'}
                  </p>
                  <p className="text-[10px] text-gray-300">
                    {day.perDayCapacity} max · {perSlotCapacity(day.isHelpAvailable)}/slot
                  </p>
                </div>
                <button
                  type="button"
                  disabled={isUpdating}
                  onClick={() => toggleDay(day.date, day.isHelpAvailable)}
                  className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors disabled:opacity-50 ${
                    day.isHelpAvailable ? 'bg-red-600' : 'bg-gray-700'
                  }`}
                  aria-pressed={day.isHelpAvailable}
                  aria-label={`Help available on ${day.date}`}
                  title={day.isHelpAvailable ? 'Click to switch to solo (3 cars/day max)' : 'Click to enable help (6 cars/day max)'}
                >
                  <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                      day.isHelpAvailable ? 'translate-x-8' : 'translate-x-1'
                    }`}
                  />
                  <span className="sr-only">{day.isHelpAvailable ? 'Help on' : 'Solo'}</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
