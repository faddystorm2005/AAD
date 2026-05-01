'use client';

import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useVehicles } from '@/contexts/VehicleContext';
import {
  SERVICES,
  ADD_ONS,
  BookingData,
  calculatePricing,
  isCeramicSelected,
} from '@/lib/bookingPricing';
import { supabase } from '@/lib/supabaseClient';
import {
  SLOT_LABELS,
  SLOT_TIMES,
  CERAMIC_SLOT,
  SlotTime,
  DayAvailability,
} from '@/lib/slots';
import { todayAustinDateString, austinOffsetFor } from '@/lib/austinTime';
import BookingWeather from '@/components/BookingWeather';

interface BookingFormProps {
  onClose: () => void;
}

interface SlotFormData extends BookingData {
  slotDate: string;
  slotTime: SlotTime | '';
}

export default function BookingForm({ onClose }: BookingFormProps) {
  const { user, session } = useAuth();
  const { vehicles, loading: vehiclesLoading } = useVehicles();
  const [step, setStep] = useState(1);
  const [error, setError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isReturning, setIsReturning] = useState(false);
  const [availability, setAvailability] = useState<DayAvailability | null>(null);
  const [loadingAvailability, setLoadingAvailability] = useState(false);
  const lastSubmissionRef = useRef<number>(0);
  const [formData, setFormData] = useState<SlotFormData & { unit: string; notes: string }>({
    vehicleId: '',
    serviceSize: 'small',
    selectedAddOns: [],
    scheduledAt: '',
    slotDate: todayAustinDateString(),
    slotTime: '',
    address: '',
    unit: '',
    city: '',
    state: 'TX',
    zip: '',
    notes: '',
  });

  const ceramic = isCeramicSelected(formData.selectedAddOns);

  // Promo code (optional). User types a code and clicks Apply; we hit the
  // validate endpoint and store the rate so calculatePricing reflects it.
  const [promoInput, setPromoInput] = useState('');
  const [appliedPromo, setAppliedPromo] = useState<{ code: string; rate: number } | null>(null);
  const [promoBusy, setPromoBusy] = useState(false);
  const [promoError, setPromoError] = useState<string | null>(null);

  const applyPromo = async () => {
    const code = promoInput.trim();
    if (!code) return;
    setPromoBusy(true);
    setPromoError(null);
    try {
      const res = await fetch('/api/promos/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (data.valid) {
        setAppliedPromo({ code: data.code, rate: data.rate });
        setPromoError(null);
      } else {
        setAppliedPromo(null);
        setPromoError(data.reason || 'Invalid code');
      }
    } catch {
      setAppliedPromo(null);
      setPromoError('Validation failed');
    } finally {
      setPromoBusy(false);
    }
  };

  const clearPromo = () => {
    setAppliedPromo(null);
    setPromoInput('');
    setPromoError(null);
  };

  // Returning-customer preview (server still re-checks authoritatively).
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const { count } = await supabase
        .from('bookings')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('deposit_paid', true);
      if (!cancelled) setIsReturning((count ?? 0) > 0);
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  // Fetch availability whenever the picked date changes.
  useEffect(() => {
    if (!formData.slotDate) return;
    let cancelled = false;
    setLoadingAvailability(true);
    (async () => {
      try {
        const res = await fetch(
          `/api/availability?from=${formData.slotDate}&to=${formData.slotDate}`
        );
        const data = await res.json();
        if (!cancelled) {
          setAvailability(data?.days?.[0] ?? null);
        }
      } catch {
        if (!cancelled) setAvailability(null);
      } finally {
        if (!cancelled) setLoadingAvailability(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [formData.slotDate]);

  // If the user picks/unpicks ceramic, force-clear an incompatible slot choice.
  useEffect(() => {
    if (ceramic && formData.slotTime && formData.slotTime !== CERAMIC_SLOT) {
      setFormData((prev) => ({ ...prev, slotTime: '' }));
    }
  }, [ceramic, formData.slotTime]);

  const selectedVehicle = vehicles.find((v) => v.id === formData.vehicleId);
  const pricing = calculatePricing(formData, {
    isReturning,
    promoDiscountRate: appliedPromo?.rate ?? 0,
  });

  const handleVehicleChange = (vehicleId: string) => {
    const vehicle = vehicles.find((v) => v.id === vehicleId);
    if (vehicle) {
      // Clear any "please select a vehicle" error since the user just did.
      // Same pattern below for date/time/address - user fixing the issue
      // should make the error message disappear.
      setError('');
      setFormData((prev) => ({
        ...prev,
        vehicleId,
        serviceSize: vehicle.size as 'small' | 'suv' | 'truck',
      }));
    }
  };

  const handleAddOnToggle = (addonId: string) => {
    setFormData((prev) => ({
      ...prev,
      selectedAddOns: prev.selectedAddOns.includes(addonId)
        ? prev.selectedAddOns.filter((id) => id !== addonId)
        : [...prev.selectedAddOns, addonId],
    }));
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    // Any input change clears the validation error so messages don't linger
    // after the user has fixed the issue (date, address, etc.).
    if (error) setError('');
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const validateStep1 = () => {
    if (!formData.vehicleId) {
      setError('Please select a vehicle');
      return false;
    }
    setError('');
    return true;
  };

  const validateStep2 = () => {
    if (!formData.slotDate || !formData.slotTime) {
      setError('Please pick a date and a time slot');
      return false;
    }
    if (!formData.address || !formData.city || !formData.zip) {
      setError('Please fill in all address fields');
      return false;
    }
    setError('');
    return true;
  };

  const handleNext = () => {
    if (step === 1 && validateStep1()) setStep(2);
    else if (step === 2 && validateStep2()) setStep(3);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const now = Date.now();
    if (now - lastSubmissionRef.current < 2000) {
      setError('Please wait a moment before resubmitting');
      return;
    }
    lastSubmissionRef.current = now;

    if (!user || !session?.access_token) {
      setError('You must be logged in to book');
      return;
    }
    if (!formData.slotTime) {
      setError('Pick a time slot first');
      return;
    }

    setIsProcessing(true);
    setError('');

    try {
      const res = await fetch('/api/create-booking', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          vehicleId: formData.vehicleId,
          serviceSize: formData.serviceSize,
          selectedAddOns: formData.selectedAddOns,
          slotDate: formData.slotDate,
          slotTime: formData.slotTime,
          address: formData.address.trim(),
          unit: formData.unit.trim() || null,
          city: formData.city,
          state: formData.state,
          zip: formData.zip,
          notes: formData.notes.trim() || null,
          promoCode: appliedPromo?.code ?? null,
          origin: window.location.origin,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || 'Failed to create booking');
      }
      if (!data.bookingId) {
        throw new Error('Booking submitted but no ID was returned');
      }

      // Booking is now 'pending' awaiting admin approval. No payment yet -
      // the customer waits on the confirmation page until admin approves.
      window.location.href = `/booking-confirmation/${data.bookingId}`;
    } catch (err: any) {
      setError(err.message || 'An error occurred. Please try again.');
      setIsProcessing(false);
    }
  };

  const reviewWhen = formData.slotDate && formData.slotTime
    ? new Date(
        `${formData.slotDate}T${formData.slotTime}${austinOffsetFor(formData.slotDate)}`
      ).toLocaleString(undefined, {
        timeZone: 'America/Chicago',
        weekday: 'long',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      })
    : '';

  // Plain-English heading + caption per step. Older / less-technical users
  // do better when each screen tells them exactly what to do.
  const stepHeadings: Record<number, { title: string; caption: string }> = {
    1: {
      title: 'Pick your car & extras',
      caption:
        "Choose which car needs detailing, then check any extras you'd like. Skip extras if you just want a basic detail.",
    },
    2: {
      title: 'When and where',
      caption:
        "Pick a day, choose a time that works, and tell us where to come.",
    },
    3: {
      title: 'Review and submit',
      caption:
        "Look it over. We'll text you to confirm before charging anything.",
    },
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 overflow-y-auto py-6 animate-fade-in">
      <div className="w-full max-w-2xl rounded-3xl border border-white/10 bg-black p-6 sm:p-8 animate-scale-in">
        <div className="flex items-start justify-between gap-3 mb-2">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-red-500">
              Step {step} of 3
            </p>
            <h2 className="mt-1 text-2xl sm:text-3xl font-bold text-white">
              {stepHeadings[step].title}
            </h2>
          </div>
          <button
            onClick={onClose}
            disabled={isProcessing}
            aria-label="Close booking form"
            className="press shrink-0 rounded-full border border-white/20 bg-white/5 p-3 text-xl text-gray-300 hover:bg-white/10 hover:text-white disabled:opacity-50"
          >
            ✕
          </button>
        </div>
        <p className="mb-6 text-base text-gray-300">
          {stepHeadings[step].caption}
        </p>

        <div className="flex gap-2 mb-8">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`h-2 flex-1 rounded-full ${s <= step ? 'bg-red-600' : 'bg-gray-700'}`}
            />
          ))}
        </div>

        <form onSubmit={handleSubmit}>
          {/* Step 1: Vehicle & Add-ons */}
          {step === 1 && (
            <div className="space-y-8">
              <div>
                <label className="block text-base font-semibold text-white mb-3">
                  Which car? <span className="text-red-500">*</span>
                </label>
                <div className="space-y-3">
                  {vehiclesLoading ? (
                    <div className="text-base text-gray-300">Loading your saved cars...</div>
                  ) : vehicles.length === 0 ? (
                    <div className="rounded-xl border border-amber-500/40 bg-amber-900/30 p-4 text-base text-amber-100">
                      You haven&apos;t added a car yet. Close this window and tap
                      &ldquo;+ Add Vehicle&rdquo; first.
                    </div>
                  ) : (
                    vehicles.map((vehicle) => {
                      const checked = formData.vehicleId === vehicle.id;
                      return (
                        <label
                          key={vehicle.id}
                          className={`flex items-center gap-4 rounded-xl border-2 p-4 transition-colors ${
                            checked
                              ? 'border-red-500 bg-red-950/40'
                              : 'border-gray-700 bg-gray-900/40 hover:border-gray-500'
                          } ${isProcessing ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                        >
                          <input
                            type="radio"
                            name="vehicleId"
                            value={vehicle.id}
                            checked={checked}
                            onChange={() => handleVehicleChange(vehicle.id)}
                            disabled={isProcessing}
                            className="w-5 h-5 accent-red-600"
                          />
                          <div className="flex-1">
                            <p className="text-base font-semibold text-white">
                              {vehicle.year} {vehicle.make} {vehicle.model}
                              {vehicle.nickname && (
                                <span className="text-gray-400"> · {vehicle.nickname}</span>
                              )}
                            </p>
                            <p className="text-sm text-gray-300">
                              {vehicle.color} · {vehicle.size}
                            </p>
                          </div>
                        </label>
                      );
                    })
                  )}
                </div>
              </div>

              {selectedVehicle && (
                <div className="rounded-xl bg-red-950/40 border border-red-700/60 p-5">
                  <p className="text-xs uppercase tracking-[0.2em] text-red-300">
                    Base Detail Price
                  </p>
                  <p className="mt-2 text-base font-semibold text-white">
                    {SERVICES[formData.serviceSize].name}
                  </p>
                  <p className="mt-1 text-3xl font-bold text-red-400">
                    ${SERVICES[formData.serviceSize].price}
                  </p>
                  <p className="mt-2 text-sm text-red-200/80">
                    Sized for your {selectedVehicle.year} {selectedVehicle.make}{' '}
                    {selectedVehicle.model}.
                  </p>
                </div>
              )}

              <div>
                <label className="block text-base font-semibold text-white mb-1">
                  Want to add anything? <span className="text-gray-400 text-sm font-normal">(optional)</span>
                </label>
                <p className="mb-3 text-sm text-gray-300">
                  Skip this if you just want a regular detail.
                </p>
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {ADD_ONS.map((addon) => {
                    const checked = formData.selectedAddOns.includes(addon.id);
                    return (
                      <label
                        key={addon.id}
                        className={`flex items-start gap-3 rounded-xl border-2 p-3 transition-colors ${
                          checked
                            ? 'border-red-500 bg-red-950/30'
                            : 'border-gray-700 bg-gray-900/40 hover:border-gray-500'
                        } ${isProcessing ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => handleAddOnToggle(addon.id)}
                          disabled={isProcessing}
                          className="mt-1 w-5 h-5 accent-red-600"
                        />
                        <div className="flex-1">
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-base font-semibold text-white">
                              {addon.name}
                            </span>
                            <span className="text-base font-semibold text-red-300">
                              +${addon.price}
                            </span>
                          </div>
                          {addon.description && (
                            <p className="mt-1 text-sm text-gray-300">{addon.description}</p>
                          )}
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              {ceramic && (
                <div className="rounded-xl border-2 border-yellow-600 bg-yellow-900/30 p-4 text-sm text-yellow-100">
                  <p className="font-semibold text-base">About Ceramic Coating</p>
                  <p className="mt-2">
                    It&apos;s an all-day job, so we only do <strong>one ceramic per day</strong>.
                    The only available time is <strong>9:00 AM</strong>. The coating provides
                    <strong>multi-year protection</strong>.
                  </p>
                </div>
              )}

              {pricing.addOns > 0 && (
                <div className="rounded-xl bg-gray-900 border border-gray-700 p-4">
                  <p className="text-base text-gray-200">
                    Extras subtotal:{' '}
                    <span className="font-bold text-white">${pricing.addOns.toFixed(2)}</span>
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Date / Slot / Address */}
          {step === 2 && (
            <div className="space-y-8">
              <div>
                <label className="block text-base font-semibold text-white mb-2">
                  What day works? <span className="text-red-500">*</span>
                </label>
                <p className="mb-3 text-sm text-gray-300">
                  Tap the box to pick a date on the calendar.
                </p>
                <input
                  type="date"
                  name="slotDate"
                  min={todayAustinDateString()}
                  value={formData.slotDate}
                  onChange={(e) => {
                    if (error) setError('');
                    setFormData((prev) => ({ ...prev, slotDate: e.target.value, slotTime: '' }));
                  }}
                  disabled={isProcessing}
                  className="w-full rounded-xl border-2 border-gray-700 bg-gray-900 px-4 py-3 text-base text-white focus:border-red-500 focus:outline-none disabled:opacity-50"
                />
                {formData.slotDate && (
                  <div className="mt-3">
                    <BookingWeather date={formData.slotDate} />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-base font-semibold text-white mb-2">
                  Pick a time <span className="text-red-500">*</span>
                </label>
                <p className="mb-3 text-sm text-gray-300">
                  Tap whichever time works best.
                </p>
                {loadingAvailability ? (
                  <p className="text-base text-gray-300">Checking what&apos;s open...</p>
                ) : availability ? (
                  <>
                    <div className="grid grid-cols-3 gap-3">
                      {SLOT_TIMES.map((time) => {
                        const slot = availability.slots.find((s) => s.time === time)!;
                        const usable = ceramic ? slot.availableForCeramic : slot.availableForRegular;
                        const isSelected = formData.slotTime === time;
                        let reason = '';
                        if (!usable) {
                          if (ceramic && time !== CERAMIC_SLOT) reason = 'Mornings only';
                          else if (slot.ceramicTaken) reason = 'Booked';
                          else if (slot.takenCount >= slot.perSlotCapacity) reason = 'Full';
                          else if (availability.totalBookings >= availability.perDayCapacity) reason = 'Day full';
                          else reason = 'Not available';
                        }
                        return (
                          <button
                            key={time}
                            type="button"
                            disabled={!usable || isProcessing}
                            onClick={() => {
                              if (error) setError('');
                              setFormData((prev) => ({ ...prev, slotTime: time }));
                            }}
                            className={`rounded-xl border-2 px-3 py-4 text-base transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                              isSelected
                                ? 'border-red-500 bg-red-600 text-white shadow-lg shadow-red-900/50'
                                : usable
                                ? 'border-gray-700 bg-gray-900 text-white hover:border-gray-500'
                                : 'border-gray-800 bg-gray-900/50 text-gray-500'
                            }`}
                          >
                            <p className="text-base font-bold">{slot.label}</p>
                            <p className="mt-1 text-xs uppercase tracking-wider opacity-90">
                              {usable
                                ? slot.takenCount === 0
                                  ? 'Open'
                                  : `${slot.takenCount}/${slot.perSlotCapacity} booked`
                                : reason}
                            </p>
                          </button>
                        );
                      })}
                    </div>
                  </>
                ) : (
                  <p className="text-base text-gray-300">Pick a date above first.</p>
                )}
              </div>

              <div>
                <label htmlFor="booking-address" className="block text-base font-semibold text-white mb-2">
                  Street address <span className="text-red-500">*</span>
                </label>
                <p className="mb-3 text-sm text-gray-300">
                  Where should we come? Driveway, office lot, garage, all good.
                </p>
                <input
                  id="booking-address"
                  type="text"
                  name="address"
                  autoComplete="street-address"
                  value={formData.address}
                  onChange={handleChange}
                  disabled={isProcessing}
                  placeholder="123 Main St"
                  className="w-full rounded-xl border-2 border-gray-700 bg-gray-900 px-4 py-3 text-base text-white placeholder-gray-500 focus:border-red-500 focus:outline-none disabled:opacity-50"
                />
              </div>

              <div>
                <label htmlFor="booking-unit" className="block text-base font-semibold text-white mb-2">
                  Apt / Suite / Unit <span className="text-gray-400 text-sm font-normal">(optional)</span>
                </label>
                <input
                  id="booking-unit"
                  type="text"
                  name="unit"
                  autoComplete="address-line2"
                  value={formData.unit}
                  onChange={handleChange}
                  disabled={isProcessing}
                  placeholder="Apt 3B, Suite 200, etc."
                  className="w-full rounded-xl border-2 border-gray-700 bg-gray-900 px-4 py-3 text-base text-white placeholder-gray-500 focus:border-red-500 focus:outline-none disabled:opacity-50"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <label htmlFor="booking-city" className="block text-base font-semibold text-white mb-2">
                    City <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="booking-city"
                    type="text"
                    name="city"
                    autoComplete="address-level2"
                    value={formData.city}
                    onChange={handleChange}
                    disabled={isProcessing}
                    placeholder="Austin"
                    className="w-full rounded-xl border-2 border-gray-700 bg-gray-900 px-4 py-3 text-base text-white placeholder-gray-500 focus:border-red-500 focus:outline-none disabled:opacity-50"
                  />
                </div>
                <div>
                  <label htmlFor="booking-state" className="block text-base font-semibold text-white mb-2">
                    State <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="booking-state"
                    type="text"
                    name="state"
                    autoComplete="address-level1"
                    value={formData.state}
                    onChange={handleChange}
                    disabled={isProcessing}
                    placeholder="TX"
                    maxLength={2}
                    className="w-full rounded-xl border-2 border-gray-700 bg-gray-900 px-4 py-3 text-base text-white uppercase focus:border-red-500 focus:outline-none disabled:opacity-50"
                  />
                </div>
                <div>
                  <label htmlFor="booking-zip" className="block text-base font-semibold text-white mb-2">
                    ZIP <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="booking-zip"
                    type="text"
                    name="zip"
                    autoComplete="postal-code"
                    inputMode="numeric"
                    value={formData.zip}
                    onChange={handleChange}
                    disabled={isProcessing}
                    placeholder="78701"
                    className="w-full rounded-xl border-2 border-gray-700 bg-gray-900 px-4 py-3 text-base text-white placeholder-gray-500 focus:border-red-500 focus:outline-none disabled:opacity-50"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="booking-notes" className="block text-base font-semibold text-white mb-2">
                  Anything we should know? <span className="text-gray-400 text-sm font-normal">(optional)</span>
                </label>
                <p className="mb-3 text-sm text-gray-300">
                  Special instructions, gate codes, where to park, the friendly dog out back. Anything that helps us get to your car easily.
                </p>
                <textarea
                  id="booking-notes"
                  name="notes"
                  value={formData.notes}
                  onChange={(e) => {
                    if (error) setError('');
                    setFormData((prev) => ({ ...prev, notes: e.target.value.slice(0, 500) }));
                  }}
                  disabled={isProcessing}
                  rows={3}
                  maxLength={500}
                  placeholder="Park in the driveway, doorbell is broken, please knock loudly..."
                  className="w-full resize-none rounded-xl border-2 border-gray-700 bg-gray-900 px-4 py-3 text-base text-white placeholder-gray-500 focus:border-red-500 focus:outline-none disabled:opacity-50"
                />
                <p className="mt-1 text-xs text-gray-400">
                  {formData.notes.length}/500 characters
                </p>
              </div>
            </div>
          )}

          {/* Step 3: Review */}
          {step === 3 && (
            <div className="space-y-6">
              <div className="rounded-2xl bg-gray-900 border border-gray-700 p-5 space-y-5">
                <ReviewLine label="Car" value={`${selectedVehicle?.year ?? ''} ${selectedVehicle?.make ?? ''} ${selectedVehicle?.model ?? ''}`.trim()} />
                <ReviewLine label="Service" value={SERVICES[formData.serviceSize].name} />

                {formData.selectedAddOns.length > 0 && (
                  <div>
                    <p className="text-sm uppercase tracking-wider text-gray-400">Extras</p>
                    <ul className="mt-2 space-y-1">
                      {formData.selectedAddOns.map((id) => {
                        const addon = ADD_ONS.find((a) => a.id === id);
                        return (
                          <li key={id} className="text-base text-white">
                            • {addon?.name}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}

                <ReviewLine
                  label="We'll come to"
                  value={`${formData.address}${formData.unit.trim() ? ' ' + formData.unit.trim() : ''}, ${formData.city}, ${formData.state} ${formData.zip}`}
                />
                <ReviewLine
                  label="Day & time"
                  value={`${reviewWhen}${
                    formData.slotTime ? ` (${SLOT_LABELS[formData.slotTime]})` : ''
                  }`}
                />

                {formData.notes.trim() && (
                  <div>
                    <p className="text-sm uppercase tracking-wider text-gray-400">Special instructions</p>
                    <p className="mt-1 text-base text-white whitespace-pre-wrap">
                      {formData.notes.trim()}
                    </p>
                  </div>
                )}

                <div className="border-t border-gray-700 pt-4 space-y-2">
                  <div className="flex justify-between text-base text-gray-300">
                    <span>Detail</span>
                    <span>${pricing.service.toFixed(2)}</span>
                  </div>
                  {pricing.addOns > 0 && (
                    <div className="flex justify-between text-base text-gray-300">
                      <span>Extras</span>
                      <span>${pricing.addOns.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-base text-gray-300">
                    <span>Subtotal</span>
                    <span>${pricing.subtotal.toFixed(2)}</span>
                  </div>
                  {pricing.discount > 0 && (() => {
                    const ratePct = Math.round((pricing.discount / pricing.subtotal) * 100);
                    const label = appliedPromo
                      ? `Promo "${appliedPromo.code}" -${appliedPromo.rate}%`
                      : isReturning
                      ? `Returning customer -${ratePct}%`
                      : `Discount -${ratePct}%`;
                    return (
                      <div className="flex justify-between text-base text-green-400">
                        <span>{label}</span>
                        <span>-${pricing.discount.toFixed(2)}</span>
                      </div>
                    );
                  })()}
                  <div className="flex justify-between text-xl font-bold text-white pt-3 border-t border-gray-700">
                    <span>Total</span>
                    <span>${pricing.total.toFixed(2)}</span>
                  </div>
                </div>

                {/* Promo code entry - appears in the review step. */}
                <div className="rounded-xl border border-gray-700 bg-black/30 p-4">
                  {appliedPromo ? (
                    <div className="flex items-center justify-between gap-2 text-base">
                      <span className="text-green-300">
                        ✓ Code{' '}
                        <span className="font-mono font-semibold">{appliedPromo.code}</span>{' '}
                        applied · {appliedPromo.rate}% off
                      </span>
                      <button
                        type="button"
                        onClick={clearPromo}
                        disabled={isProcessing}
                        className="press text-sm text-gray-300 underline hover:text-white disabled:opacity-50"
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <label className="block text-base font-semibold text-white">
                        Have a promo code? <span className="text-gray-400 text-sm font-normal">(optional)</span>
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={promoInput}
                          onChange={(e) => setPromoInput(e.target.value.toUpperCase())}
                          placeholder="SPRING25"
                          disabled={isProcessing || promoBusy}
                          className="flex-1 rounded-xl border-2 border-gray-700 bg-gray-900 px-3 py-2 text-base font-mono text-white placeholder-gray-500 focus:border-red-500 focus:outline-none disabled:opacity-50"
                        />
                        <button
                          type="button"
                          onClick={applyPromo}
                          disabled={isProcessing || promoBusy || !promoInput.trim()}
                          className="btn-primary press shrink-0 rounded-xl px-4 py-2 text-base font-semibold disabled:opacity-50"
                        >
                          {promoBusy ? 'Checking…' : 'Apply'}
                        </button>
                      </div>
                      {promoError && (
                        <p className="text-sm text-red-300">{promoError}</p>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-2xl border-2 border-red-700 bg-red-950/40 p-5">
                <p className="text-base font-semibold text-white">
                  $ {pricing.deposit.toFixed(2)} deposit holds your slot
                </p>
                <p className="mt-2 text-base text-red-100">
                  Nothing is charged until we approve your booking and send you a payment link. The remaining{' '}
                  <strong>${(pricing.total - pricing.deposit).toFixed(2)}</strong> is paid on-site after the work is done.
                </p>
              </div>
            </div>
          )}

          {/* Running total - persistent across all 3 steps once a vehicle is
              picked. Customer always knows what they're committing to before
              tapping Next or Submit. */}
          {selectedVehicle && (
            <div className="mt-6 flex items-center justify-between rounded-xl border-2 border-red-700/50 bg-gradient-to-r from-red-950/40 to-red-900/20 p-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-red-300">
                  Running Total
                </p>
                <p className="mt-1 text-2xl font-bold text-white sm:text-3xl">
                  ${pricing.total.toFixed(2)}
                </p>
              </div>
              <p className="text-right text-xs text-gray-300 sm:text-sm">
                ${pricing.deposit.toFixed(2)} deposit
                <br />
                holds your slot
              </p>
            </div>
          )}

          {error && (
            <div role="alert" className="rounded-xl border-2 border-red-700 bg-red-900/40 p-4 text-base text-red-100 mt-6">
              {error}
            </div>
          )}

          <div className="flex flex-col-reverse gap-3 pt-8 sm:flex-row">
            {step > 1 && (
              <button
                type="button"
                onClick={() => setStep(step - 1)}
                disabled={isProcessing}
                className="press flex-1 rounded-xl border-2 border-gray-600 px-5 py-4 text-base font-semibold text-white hover:bg-gray-800 disabled:opacity-50"
              >
                ← Back
              </button>
            )}
            {step < 3 && (
              <button
                type="button"
                onClick={handleNext}
                disabled={isProcessing}
                className="btn-primary press flex-1 rounded-xl px-5 py-4 text-base font-semibold disabled:opacity-50"
              >
                Next →
              </button>
            )}
            {step === 3 && (
              <button
                type="submit"
                disabled={isProcessing}
                className="btn-primary press flex-1 rounded-xl px-5 py-4 text-base font-bold disabled:opacity-50"
              >
                {isProcessing ? 'Sending…' : 'Send for approval'}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}

function ReviewLine({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-sm uppercase tracking-wider text-gray-400">{label}</p>
      <p className="mt-1 text-base font-semibold text-white">{value}</p>
    </div>
  );
}
