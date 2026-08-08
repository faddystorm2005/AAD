'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { todayPhoenixDateString } from '@/lib/phoenixTime';
import { SLOT_TIMES, SLOT_LABELS, SlotTime, DayAvailability } from '@/lib/slots';
import BookingWeather from '@/components/BookingWeather';
import { errorMessage } from '@/lib/errors';

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
  const [slotDate, setSlotDate] = useState(currentSlotDate || todayPhoenixDateString());
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
    // Fetches availability from the API when the modal opens.
    // eslint-disable-next-line react-hooks/set-state-in-effect
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
    } catch (err) {
      setError(errorMessage(err, 'Reschedule failed'));
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
      <div className="glass-card animate-scale-in w-full max-w-md rounded-3xl p-6 sm:p-7">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-gold-500">
              Move it
            </p>
            <h2 id="reschedule-title" className="mt-1 text-2xl font-bold text-white">
              Reschedule booking
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            aria-label="Close"
            className="press shrink-0 rounded-full border border-white/20 bg-white/5 p-2.5 text-lg text-gray-200 hover:bg-white/10 hover:text-white disabled:opacity-50"
          >
            ✕
          </button>
        </div>

        {/* Date */}
        <label htmlFor="reschedule-date" className="block text-base font-semibold text-white">
          New date
        </label>
        <input
          id="reschedule-date"
          type="date"
          min={todayPhoenixDateString()}
          value={slotDate}
          onChange={(e) => {
            setSlotDate(e.target.value);
            setSlotTime('');
            setError(null);
          }}
          disabled={submitting}
          className="mt-2 w-full rounded-xl border-2 border-gray-700 bg-gray-900 px-4 py-3 text-base text-white focus:border-gold-500 focus:outline-none disabled:opacity-50"
        />
        {slotDate && (
          <div className="mt-3">
            <BookingWeather date={slotDate} compact />
          </div>
        )}

        {/* Slot */}
        <label className="mt-5 block text-base font-semibold text-white">
          New time
        </label>
        {loadingAvail ? (
          <p className="mt-2 text-base text-gray-300">Checking what&apos;s open…</p>
        ) : availability ? (
          <div className="mt-2 grid grid-cols-3 gap-3">
            {SLOT_TIMES.map((time) => {
              const slot = availability.slots.find((s) => s.time === time)!;
              const usable = isCeramic ? slot.availableForCeramic : slot.availableForRegular;
              const isCurrent = time === currentSlotTime && slotDate === currentSlotDate;
              const isSelected = slotTime === time;
              let reason = '';
              if (!usable) {
                if (slot.takenCount >= slot.perSlotCapacity) reason = 'Full';
                else if (availability.totalBookings >= availability.perDayCapacity) reason = 'Day full';
                else reason = 'Not available';
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
                  className={`rounded-xl border-2 px-3 py-4 text-base transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                    isSelected
                      ? 'border-gold-500 bg-gold-600 text-black shadow-lg shadow-gold-900/50'
                      : usable
                      ? 'border-gray-700 bg-gray-900 text-white hover:border-gray-500'
                      : 'border-gray-800 bg-gray-900/50 text-gray-300'
                  }`}
                >
                  <p className="text-base font-bold">{SLOT_LABELS[time as SlotTime]}</p>
                  <p className="mt-1 text-xs uppercase tracking-wider opacity-90">
                    {isCurrent ? 'Current' : usable ? (slot.takenCount === 0 ? 'Open' : `${slot.takenCount}/${slot.perSlotCapacity}`) : reason}
                  </p>
                </button>
              );
            })}
          </div>
        ) : (
          <p className="mt-2 text-base text-gray-300">Pick a date above first.</p>
        )}

        {error && (
          <div role="alert" className="mt-4 rounded-xl border-2 border-red-700 bg-red-900/40 p-4 text-base text-red-100">
            {error}
          </div>
        )}

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="press flex-1 rounded-xl border-2 border-gray-600 px-5 py-3.5 text-base font-semibold text-white hover:bg-gray-800 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting || !slotDate || !slotTime}
            className="btn-primary press flex-1 rounded-xl px-5 py-3.5 text-base font-semibold disabled:opacity-50"
          >
            {submitting ? 'Saving…' : 'Reschedule'}
          </button>
        </div>
      </div>
    </div>
  );
}
