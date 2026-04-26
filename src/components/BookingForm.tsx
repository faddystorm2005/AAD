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
  const [formData, setFormData] = useState<SlotFormData>({
    vehicleId: '',
    serviceSize: 'small',
    selectedAddOns: [],
    scheduledAt: '',
    slotDate: todayAustinDateString(),
    slotTime: '',
    address: '',
    city: '',
    state: 'TX',
    zip: '',
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
          address: formData.address,
          city: formData.city,
          state: formData.state,
          zip: formData.zip,
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

      // Booking is now 'pending' awaiting admin approval. No payment yet —
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-6 overflow-y-auto py-8 animate-fade-in">
      <div className="w-full max-w-2xl rounded-3xl border border-white/10 bg-black p-8 animate-scale-in">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white">Book a Detail</h2>
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="text-gray-400 hover:text-white text-xl disabled:opacity-50"
          >
            ✕
          </button>
        </div>

        <div className="flex gap-2 mb-8">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`h-1 flex-1 rounded-full ${s <= step ? 'bg-red-600' : 'bg-gray-700'}`}
            />
          ))}
        </div>

        <form onSubmit={handleSubmit}>
          {/* Step 1: Vehicle & Add-ons */}
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-3">
                  Select Vehicle <span className="text-red-600">*</span>
                </label>
                <div className="space-y-2">
                  {vehiclesLoading ? (
                    <div className="text-gray-400">Loading vehicles...</div>
                  ) : vehicles.length === 0 ? (
                    <div className="text-gray-400">
                      No vehicles saved. Please add a vehicle first.
                    </div>
                  ) : (
                    vehicles.map((vehicle) => (
                      <label
                        key={vehicle.id}
                        className={`flex items-center gap-3 p-3 rounded-lg border border-gray-600 hover:border-gray-500 ${
                          isProcessing ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                        }`}
                      >
                        <input
                          type="radio"
                          name="vehicleId"
                          value={vehicle.id}
                          checked={formData.vehicleId === vehicle.id}
                          onChange={() => handleVehicleChange(vehicle.id)}
                          disabled={isProcessing}
                          className="w-4 h-4"
                        />
                        <div className="flex-1">
                          <p className="text-white font-medium">
                            {vehicle.year} {vehicle.make} {vehicle.model}
                            {vehicle.nickname && ` • ${vehicle.nickname}`}
                          </p>
                          <p className="text-sm text-gray-400">
                            {vehicle.color} • {vehicle.size}
                          </p>
                        </div>
                      </label>
                    ))
                  )}
                </div>
              </div>

              {selectedVehicle && (
                <div className="rounded-lg bg-red-900/20 border border-red-700 p-4">
                  <p className="text-sm text-red-200">
                    Service: <span className="font-semibold">{SERVICES[formData.serviceSize].name}</span>
                  </p>
                  <p className="text-lg font-bold text-red-400 mt-1">
                    ${SERVICES[formData.serviceSize].price}
                  </p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-3">
                  Add-ons (Optional)
                </label>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {ADD_ONS.map((addon) => (
                    <label
                      key={addon.id}
                      className={`flex items-start gap-3 p-2 rounded ${
                        isProcessing ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-800'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={formData.selectedAddOns.includes(addon.id)}
                        onChange={() => handleAddOnToggle(addon.id)}
                        disabled={isProcessing}
                        className="mt-1 w-4 h-4"
                      />
                      <div className="flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-white text-sm">{addon.name}</span>
                          <span className="text-gray-400 text-sm">+${addon.price}</span>
                        </div>
                        {addon.description && (
                          <p className="mt-0.5 text-xs text-gray-400">{addon.description}</p>
                        )}
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {ceramic && (
                <div className="rounded-lg border border-yellow-700 bg-yellow-900/20 p-3 text-xs text-yellow-200">
                  Ceramic Coating is <strong>mornings only</strong> — bookable only
                  at the <strong>first slot of the day (9:00 AM)</strong>. It&apos;s a
                  full-day job, so it&apos;s the only car detailed that day
                  (1 ceramic per day). Lasts up to <strong>10 years</strong>.
                </div>
              )}

              {pricing.addOns > 0 && (
                <div className="rounded-lg bg-gray-800 p-3">
                  <p className="text-sm text-gray-300">
                    Add-ons total: <span className="font-semibold text-white">${pricing.addOns}</span>
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Date / Slot / Address */}
          {step === 2 && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Date <span className="text-red-600">*</span>
                </label>
                <input
                  type="date"
                  name="slotDate"
                  min={todayAustinDateString()}
                  value={formData.slotDate}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, slotDate: e.target.value, slotTime: '' }))
                  }
                  disabled={isProcessing}
                  className="w-full rounded-lg border border-gray-600 bg-gray-800 px-3 py-2 text-white focus:border-red-500 focus:outline-none disabled:opacity-50"
                />
                {formData.slotDate && (
                  <div className="mt-2">
                    <BookingWeather date={formData.slotDate} />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Time slot <span className="text-red-600">*</span>
                </label>
                {loadingAvailability ? (
                  <p className="text-sm text-gray-400">Checking availability...</p>
                ) : availability ? (
                  <>
                    <div className="grid grid-cols-3 gap-2">
                      {SLOT_TIMES.map((time) => {
                        const slot = availability.slots.find((s) => s.time === time)!;
                        const usable = ceramic ? slot.availableForCeramic : slot.availableForRegular;
                        const isSelected = formData.slotTime === time;
                        let reason = '';
                        if (!usable) {
                          if (ceramic && time !== CERAMIC_SLOT) reason = 'Ceramic = 1st slot AM';
                          else if (slot.ceramicTaken) reason = 'Ceramic booked';
                          else if (slot.takenCount >= slot.perSlotCapacity) reason = 'Full';
                          else if (availability.totalBookings >= availability.perDayCapacity) reason = 'Day full';
                          else reason = 'Unavailable';
                        }
                        return (
                          <button
                            key={time}
                            type="button"
                            disabled={!usable || isProcessing}
                            onClick={() =>
                              setFormData((prev) => ({ ...prev, slotTime: time }))
                            }
                            className={`rounded-lg border px-3 py-3 text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                              isSelected
                                ? 'border-red-500 bg-red-600 text-white'
                                : usable
                                ? 'border-gray-600 bg-gray-800 text-white hover:bg-gray-700'
                                : 'border-gray-700 bg-gray-900 text-gray-500'
                            }`}
                          >
                            <p className="font-semibold">{slot.label}</p>
                            <p className="mt-1 text-[10px] uppercase tracking-wider">
                              {usable
                                ? `${slot.takenCount}/${slot.perSlotCapacity} booked`
                                : reason}
                            </p>
                          </button>
                        );
                      })}
                    </div>
                    <p className="mt-2 text-xs text-gray-500">
                      {availability.isHelpAvailable
                        ? `Help available — up to ${availability.perDayCapacity} cars / day, 2 per slot.`
                        : `Solo day — up to ${availability.perDayCapacity} cars / day, 1 per slot.`}{' '}
                      Currently booked: {availability.totalBookings}.
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-gray-400">Pick a date to see slots.</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Street Address <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  disabled={isProcessing}
                  placeholder="123 Main St"
                  className="w-full rounded-lg border border-gray-600 bg-gray-800 px-3 py-2 text-white placeholder-gray-500 focus:border-red-500 focus:outline-none disabled:opacity-50"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    City <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="text"
                    name="city"
                    value={formData.city}
                    onChange={handleChange}
                    disabled={isProcessing}
                    placeholder="Austin"
                    className="w-full rounded-lg border border-gray-600 bg-gray-800 px-3 py-2 text-white placeholder-gray-500 focus:border-red-500 focus:outline-none disabled:opacity-50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    State <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="text"
                    name="state"
                    value={formData.state}
                    onChange={handleChange}
                    disabled={isProcessing}
                    placeholder="TX"
                    maxLength={2}
                    className="w-full rounded-lg border border-gray-600 bg-gray-800 px-3 py-2 text-white uppercase focus:border-red-500 focus:outline-none disabled:opacity-50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    ZIP <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="text"
                    name="zip"
                    value={formData.zip}
                    onChange={handleChange}
                    disabled={isProcessing}
                    placeholder="78701"
                    className="w-full rounded-lg border border-gray-600 bg-gray-800 px-3 py-2 text-white placeholder-gray-500 focus:border-red-500 focus:outline-none disabled:opacity-50"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Review */}
          {step === 3 && (
            <div className="space-y-6">
              <div className="rounded-lg bg-gray-800 p-6 space-y-4">
                <div>
                  <p className="text-sm text-gray-400">Vehicle</p>
                  <p className="text-lg font-semibold text-white">
                    {selectedVehicle?.year} {selectedVehicle?.make} {selectedVehicle?.model}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-gray-400">Service</p>
                  <p className="text-lg font-semibold text-white">
                    {SERVICES[formData.serviceSize].name}
                  </p>
                </div>

                {formData.selectedAddOns.length > 0 && (
                  <div>
                    <p className="text-sm text-gray-400">Add-ons</p>
                    <ul className="text-white space-y-1">
                      {formData.selectedAddOns.map((id) => {
                        const addon = ADD_ONS.find((a) => a.id === id);
                        return (
                          <li key={id} className="text-sm">
                            {addon?.name}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}

                <div>
                  <p className="text-sm text-gray-400">Location</p>
                  <p className="text-white">
                    {formData.address}, {formData.city}, {formData.state} {formData.zip}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-gray-400">Scheduled</p>
                  <p className="text-white">
                    {reviewWhen}
                    {formData.slotTime && ` (${SLOT_LABELS[formData.slotTime]})`}
                  </p>
                </div>

                <div className="border-t border-gray-600 pt-4">
                  <div className="flex justify-between text-gray-400 mb-2">
                    <span>Service</span>
                    <span>${pricing.service}</span>
                  </div>
                  {pricing.addOns > 0 && (
                    <div className="flex justify-between text-gray-400 mb-2">
                      <span>Add-ons</span>
                      <span>${pricing.addOns}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-gray-400 mb-2">
                    <span>Subtotal</span>
                    <span>${pricing.subtotal.toFixed(2)}</span>
                  </div>
                  {pricing.discount > 0 && (
                    <div className="flex justify-between text-green-400 mb-2">
                      <span>
                        {appliedPromo
                          ? `Promo "${appliedPromo.code}" −${appliedPromo.rate}%`
                          : 'Returning customer −10%'}
                      </span>
                      <span>−${pricing.discount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-white font-semibold mb-3">
                    <span>Total</span>
                    <span>${pricing.total.toFixed(2)}</span>
                  </div>

                  {/* Promo code entry — appears in the review step. */}
                  <div className="mb-3 rounded-lg border border-gray-700 bg-gray-900/40 p-3">
                    {appliedPromo ? (
                      <div className="flex items-center justify-between gap-2 text-sm">
                        <span className="text-green-300">
                          ✓ Code <span className="font-mono font-semibold">{appliedPromo.code}</span> applied —{' '}
                          {appliedPromo.rate}% off
                        </span>
                        <button
                          type="button"
                          onClick={clearPromo}
                          disabled={isProcessing}
                          className="text-xs text-gray-400 underline hover:text-gray-200 disabled:opacity-50"
                        >
                          Remove
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <label className="block text-xs font-medium text-gray-300">
                          Have a promo code?
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={promoInput}
                            onChange={(e) => setPromoInput(e.target.value.toUpperCase())}
                            placeholder="e.g. SPRING25"
                            disabled={isProcessing || promoBusy}
                            className="flex-1 rounded-lg border border-gray-600 bg-gray-800 px-3 py-1.5 text-sm font-mono text-white placeholder-gray-500 focus:border-red-500 focus:outline-none disabled:opacity-50"
                          />
                          <button
                            type="button"
                            onClick={applyPromo}
                            disabled={isProcessing || promoBusy || !promoInput.trim()}
                            className="press shrink-0 rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                          >
                            {promoBusy ? '…' : 'Apply'}
                          </button>
                        </div>
                        {promoError && (
                          <p className="text-xs text-red-300">{promoError}</p>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="bg-red-900/20 border border-red-700 rounded p-3">
                    <p className="text-sm text-red-200">
                      Deposit on approval: <span className="font-bold">${pricing.deposit}</span>
                    </p>
                    <p className="text-xs text-red-300 mt-1">
                      You won&apos;t be charged until Austin Auto Detail approves your booking.
                      Remaining ${(pricing.total - pricing.deposit).toFixed(2)} due on-site.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="rounded-lg bg-red-900/50 border border-red-700 p-3 text-sm text-red-200 mb-6">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-6">
            {step > 1 && (
              <button
                type="button"
                onClick={() => setStep(step - 1)}
                disabled={isProcessing}
                className="flex-1 rounded-lg border border-gray-600 px-4 py-2 text-white hover:bg-gray-800 disabled:opacity-50"
              >
                Back
              </button>
            )}
            {step < 3 && (
              <button
                type="button"
                onClick={handleNext}
                disabled={isProcessing}
                className="flex-1 rounded-lg bg-red-600 px-4 py-2 text-white hover:bg-red-700 disabled:opacity-50"
              >
                Next
              </button>
            )}
            {step === 3 && (
              <button
                type="submit"
                disabled={isProcessing}
                className="flex-1 rounded-lg bg-red-600 px-4 py-2 text-white hover:bg-red-700 font-semibold disabled:opacity-50"
              >
                {isProcessing ? 'Submitting...' : 'Submit for Approval'}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
