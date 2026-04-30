'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { todayAustinDateString } from '@/lib/austinTime';
import { SLOT_TIMES, SLOT_LABELS, SlotTime, CERAMIC_SLOT, DayAvailability } from '@/lib/slots';
import BookingWeather from '@/components/BookingWeather';

interface Props {
  bookingId: string;
  isCeramic: boolean;
  currentSlotDate: string;
  currentSlotTime: string;
  onClose: () => void;
  onRescheduled: () => void;
}

/**
 * Customer-facing reschedule modal. Lets a user move a booking to a new
 * date + slot. Server-side /api/bookings/reschedule does the authoritative
 * availability check.
 */
export default function RescheduleModal({
  bookingId,
  isCeramic,
  currentSlotDate,
  currentSlotTime,
  onClose,
  onRescheduled,
}: Props) {
  const { session } = useAuth();
  const [slotDate, setSlotDate] = useState(currentSlotDate || todayAustinDateString());
  const [slotTime, setSlotTime] = useState<string>(currentSlotTime || '');
  const [availability, setAvailability] = useState<DayAvailability | null>(null);
  const [loadingAvail, setLoadingAvail] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Lock background scroll while modal is open.
  useEffect(() => {
    const original = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = original;
    };
  }, []);

  // Fetch availability whenever the date changes.
  useEffect(() => {
    if (!slotDate) return;
    let cancelled = false;
    setLoadingAvail(true);
    fetch(`/api/availability?from=${slotDate}&to=${slotDate}`)
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) setAvailability(data?.days?.[0] ?? null);
      })
      .catch(() => {
        if (!cancelled) setAvailability(null);
      })
      .finally(() => {
        if (!cancelled) setLoadingAvail(false);
      });
    return () => {
      cancelled = true;
    };
  }, [slotDate]);

  const handleSubmit = async () => {
    if (!session?.access_token) return;
    if (!slotDate || !slotTime) {
      setError('Pick a date and a slot.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/bookings/reschedule', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ bookingId, slotDate, slotTime }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Reschedule failed');
      onRescheduled();
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Reschedule failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="animate-fade-in fixed inset-0 z-[200] flex items-center justify-center bg-black/70 p-4 backdrop-blur"
      role="dialog"
      aria-modal="true"
      aria-labelledby="reschedule-title"
    >
      <div className="glass-card animate-scale-in w-full max-w-md rounded-2xl p-6">
        <div className="mb-4 flex items-start justify-between gap-3">
          <h2 id="reschedule-title" className="text-lg font-bold text-white">
            Reschedule booking
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="text-gray-400 hover:text-white disabled:opacity-50"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Date */}
        <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400">
          New date
        </label>
        <input
          type="date"
          min={todayAustinDateString()}
          value={slotDate}
          onChange={(e) => {
            setSlotDate(e.target.value);
            setSlotTime('');
            setError(null);
          }}
          disabled={submitting}
          className="mt-2 w-full rounded-lg border border-gray-600 bg-gray-800 px-3 py-2 text-white focus:border-red-500 focus:outline-none disabled:opacity-50"
        />
        {slotDate && (
          <div className="mt-2">
            <BookingWeather date={slotDate} compact />
          </div>
        )}

        {/* Slot */}
        <label className="mt-4 block text-xs font-semibold uppercase tracking-wider text-gray-400">
          New time slot
        </label>
        {loadingAvail ? (
          <p className="mt-2 text-sm text-gray-400">Checking availability…</p>
        ) : availability ? (
          <div className="mt-2 grid grid-cols-3 gap-2">
            {SLOT_TIMES.map((time) => {
              const slot = availability.slots.find((s) => s.time === time)!;
              const usable = isCeramic ? slot.availableForCeramic : slot.availableForRegular;
              const isCurrent = time === currentSlotTime && slotDate === currentSlotDate;
              const isSelected = slotTime === time;
              let reason = '';
              if (!usable) {
                if (isCeramic && time !== CERAMIC_SLOT) reason = 'Ceramic = 9am';
                else if (slot.ceramicTaken) reason = 'Ceramic booked';
                else if (slot.takenCount >= slot.perSlotCapacity) reason = 'Full';
                else if (availability.totalBookings >= availability.perDayCapacity) reason = 'Day full';
                else reason = 'Unavailable';
              }
              return (
                <button
                  key={time}
                  type="button"
                  disabled={!usable || submitting}
                  onClick={() => {
                    setSlotTime(time);
                    setError(null);
                  }}
                  className={`rounded-lg border px-3 py-3 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                    isSelected
                      ? 'border-red-500 bg-red-600 text-white'
                      : usable
                      ? 'border-gray-600 bg-gray-800 text-white hover:bg-gray-700'
                      : 'border-gray-700 bg-gray-900 text-gray-500'
                  }`}
                >
                  <p className="font-semibold">{SLOT_LABELS[time as SlotTime]}</p>
                  <p className="mt-1 text-[10px] uppercase tracking-wider">
                    {isCurrent ? 'Current' : usable ? `${slot.takenCount}/${slot.perSlotCapacity}` : reason}
                  </p>
                </button>
              );
            })}
          </div>
        ) : (
          <p className="mt-2 text-sm text-gray-400">Pick a date to see slots.</p>
        )}

        {error && (
          <div className="mt-4 rounded-lg border border-red-700 bg-red-900/30 p-3 text-sm text-red-200">
            {error}
          </div>
        )}

        <div className="mt-6 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="flex-1 rounded-lg border border-gray-600 px-4 py-2 text-sm text-gray-300 hover:bg-gray-800 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting || !slotDate || !slotTime}
            className="btn-primary press flex-1 rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-50"
          >
            {submitting ? 'Saving…' : 'Reschedule'}
          </button>
        </div>
      </div>
    </div>
  );
}
