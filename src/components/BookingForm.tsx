'use client';

import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useVehicles } from '@/contexts/VehicleContext';
import {
  ADD_ONS,
  BookingData,
  calculatePricing,
  isCeramicSelected,
  SERVICE_TYPES,
  ServiceType,
  SERVICE_TYPE_NAMES,
  SERVICE_TYPE_DEFAULT,
  SERVICE_PRICES,
  getAddOnPrice,
  type LivePriceTable,
} from '@/lib/bookingPricing';
import { fetchLivePriceTable } from '@/lib/livePricing';
import { supabase } from '@/lib/supabaseClient';

interface BookingFormProps {
  onClose: () => void;
}

// Simplified booking: no time slot, no deposit, no photos. The customer picks
// their car + service + extras and where to come; Austin Auto Detail texts them
// to arrange a time, and payment is on-site when the detail is done.
type SimpleFormData = Pick<
  BookingData,
  'vehicleId' | 'serviceSize' | 'selectedAddOns' | 'address' | 'city' | 'state' | 'zip'
> & { unit: string; notes: string };

const DRAFT_KEY = 'aad_booking_draft';

function loadDraft() {
  try {
    const raw = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem(DRAFT_KEY) : null;
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
function saveDraft(data: object) {
  try {
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify(data));
  } catch {}
}
function clearDraft() {
  try {
    sessionStorage.removeItem(DRAFT_KEY);
  } catch {}
}

export default function BookingForm({ onClose }: BookingFormProps) {
  const { user, session } = useAuth();
  const { vehicles, loading: vehiclesLoading } = useVehicles();
  const draft = loadDraft();
  const [step, setStep] = useState<number>(draft?.step === 2 ? 2 : 1);
  const modalRef = useRef<HTMLDivElement>(null);

  const [error, setError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isReturning, setIsReturning] = useState(false);
  const lastSubmissionRef = useRef<number>(0);
  const [serviceType, setServiceType] = useState<ServiceType>(
    draft?.serviceType ?? SERVICE_TYPE_DEFAULT
  );

  const [formData, setFormData] = useState<SimpleFormData>({
    vehicleId: draft?.formData?.vehicleId ?? '',
    serviceSize: draft?.formData?.serviceSize ?? 'small',
    selectedAddOns: draft?.formData?.selectedAddOns ?? [],
    address: draft?.formData?.address ?? '',
    unit: draft?.formData?.unit ?? '',
    city: draft?.formData?.city ?? '',
    state: draft?.formData?.state ?? 'TX',
    zip: draft?.formData?.zip ?? '',
    notes: draft?.formData?.notes ?? '',
  });

  const ceramic = isCeramicSelected(formData.selectedAddOns);

  useEffect(() => {
    modalRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }, [step]);

  // Android back button closes the modal instead of leaving the page.
  useEffect(() => {
    history.pushState({ modal: 'booking' }, '');
    const onPop = () => onClose();
    window.addEventListener('popstate', onPop);
    return () => {
      window.removeEventListener('popstate', onPop);
      if (history.state?.modal === 'booking') history.back();
    };
  }, [onClose]);

  // Returning-customer preview (server re-checks authoritatively). Keyed on a
  // prior completed detail now that deposits are gone.
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const { count } = await supabase
        .from('bookings')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('status', 'completed');
      if (!cancelled) setIsReturning((count ?? 0) > 0);
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  // Prune incompatible add-ons when the service type changes.
  useEffect(() => {
    setFormData((prev) => {
      const stillValid = prev.selectedAddOns.filter((addonId) => {
        const addon = ADD_ONS.find((a) => a.id === addonId);
        return addon?.applicableServiceTypes.includes(serviceType) ?? false;
      });
      return stillValid.length === prev.selectedAddOns.length
        ? prev
        : { ...prev, selectedAddOns: stillValid };
    });
  }, [serviceType]);

  useEffect(() => {
    saveDraft({ step, serviceType, formData });
  }, [step, serviceType, formData]);

  // Live prices from the client portal (falls back to constants).
  const [livePrices, setLivePrices] = useState<LivePriceTable | null>(null);
  useEffect(() => {
    let cancelled = false;
    fetchLivePriceTable().then((table) => {
      if (!cancelled) setLivePrices(table);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const selectedVehicle = vehicles.find((v) => v.id === formData.vehicleId);
  const pricing = calculatePricing(
    { ...formData, scheduledAt: '', serviceType },
    { isReturning, live: livePrices ?? undefined }
  );

  const handleVehicleChange = (vehicleId: string) => {
    const vehicle = vehicles.find((v) => v.id === vehicleId);
    if (vehicle) {
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

  const handleNext = () => {
    if (step === 1 && validateStep1()) setStep(2);
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
    if (!formData.vehicleId) {
      setError('Please pick your car first');
      setStep(1);
      return;
    }
    if (!formData.address || !formData.city || !formData.zip) {
      setError('Please fill in your address, city, and ZIP');
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
          serviceType: serviceType,
          selectedAddOns: formData.selectedAddOns,
          address: formData.address.trim(),
          unit: formData.unit.trim() || null,
          city: formData.city.trim(),
          state: formData.state,
          zip: formData.zip.trim(),
          notes: formData.notes.trim() || null,
          origin: window.location.origin,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed to create booking');
      if (!data.bookingId) throw new Error('Booking submitted but no ID was returned');

      clearDraft();
      window.location.href = `/booking-confirmation/${data.bookingId}`;
    } catch (err: any) {
      setError(err.message || 'An error occurred. Please try again.');
      setIsProcessing(false);
    }
  };

  const inputCls =
    'w-full rounded-xl border border-gray-700 bg-gray-900/60 px-4 py-3 text-base text-white placeholder-gray-500 focus:border-red-500 focus:outline-none';

  const stepHeadings: Record<number, { title: string; caption: string }> = {
    1: {
      title: 'Pick your car & extras',
      caption:
        "Choose which car needs detailing, then check any extras you'd like. Skip extras if you just want a basic detail.",
    },
    2: {
      title: 'Where should we come?',
      caption:
        "Tell us where the car is. We'll text you to lock in a time — no deposit, you pay on-site when it's done.",
    },
  };

  return (
    <div
      ref={modalRef}
      className="modal-safe-padding fixed inset-0 z-50 flex items-start justify-center bg-black/60 px-4 overflow-y-auto animate-fade-in"
    >
      <div className="w-full max-w-2xl rounded-3xl border border-white/10 bg-black p-6 sm:p-8 animate-scale-in">
        <div className="flex items-start justify-between gap-3 mb-2">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-red-500">
              Step {step} of 2
            </p>
            <h2 className="mt-1 text-2xl sm:text-3xl font-bold text-white">
              {stepHeadings[step].title}
            </h2>
          </div>
          <button
            onClick={onClose}
            disabled={isProcessing}
            aria-label="Close booking form"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/20 bg-white/5 text-xl text-gray-300 hover:bg-white/10 hover:text-white disabled:opacity-50"
          >
            ✕
          </button>
        </div>
        <p className="mb-6 text-base text-gray-300">{stepHeadings[step].caption}</p>

        <div className="flex gap-2 mb-8">
          {[1, 2].map((s) => (
            <div
              key={s}
              className={`h-2 flex-1 rounded-full ${s <= step ? 'bg-red-600' : 'bg-gray-700'}`}
            />
          ))}
        </div>

        <form onSubmit={handleSubmit}>
          {/* Step 1: Vehicle, service & add-ons */}
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
                                <span className="text-gray-300"> · {vehicle.nickname}</span>
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
                <div>
                  <p className="text-sm font-semibold uppercase tracking-wider text-gray-300">
                    Service Type
                  </p>
                  <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
                    {SERVICE_TYPES.map((type) => (
                      <label
                        key={type}
                        className={`flex cursor-pointer items-center justify-center rounded-xl border px-4 py-3 text-sm font-medium transition-colors ${
                          serviceType === type
                            ? 'border-red-500 bg-red-500/10 text-white'
                            : 'border-white/10 bg-white/5 text-gray-200 hover:border-white/20'
                        }`}
                      >
                        <input
                          type="radio"
                          name="serviceType"
                          value={type}
                          checked={serviceType === type}
                          onChange={() => setServiceType(type)}
                          className="sr-only"
                        />
                        {SERVICE_TYPE_NAMES[type]}
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {selectedVehicle && (
                <div className="rounded-xl bg-red-950/40 border border-red-700/60 p-5">
                  <p className="text-xs uppercase tracking-[0.2em] text-red-300">Base Detail Price</p>
                  <p className="mt-2 text-base font-semibold text-white">
                    {SERVICE_TYPE_NAMES[serviceType]}
                  </p>
                  <p className="mt-1 text-3xl font-bold text-red-400">
                    ${(livePrices?.services ?? SERVICE_PRICES)[serviceType][formData.serviceSize]}
                  </p>
                  <p className="mt-2 text-sm text-red-200/80">
                    Sized for your {selectedVehicle.year} {selectedVehicle.make}{' '}
                    {selectedVehicle.model}.
                  </p>
                </div>
              )}

              <div>
                <label className="block text-base font-semibold text-white mb-1">
                  Want to add anything?{' '}
                  <span className="text-gray-300 text-sm font-normal">(optional)</span>
                </label>
                <p className="mb-3 text-sm text-gray-300">
                  Skip this if you just want a regular detail.
                </p>
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {ADD_ONS.filter((addon) =>
                    addon.applicableServiceTypes.includes(serviceType)
                  ).map((addon) => {
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
                            <span className="text-base font-semibold text-white">{addon.name}</span>
                            <span className="text-base font-semibold text-red-300">
                              +${getAddOnPrice(addon, formData.serviceSize, livePrices ?? undefined)}
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
                    Ceramic is an all-day job that provides <strong>multi-year protection</strong>.
                    We&apos;ll coordinate the day with you directly when we reach out.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Address, notes & review */}
          {step === 2 && (
            <div className="space-y-8">
              <div className="space-y-4">
                <div>
                  <label className="block text-base font-semibold text-white mb-2">
                    Street address <span className="text-red-500">*</span>
                  </label>
                  <input
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    placeholder="123 Main St"
                    className={inputCls}
                    autoComplete="street-address"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-white mb-2">
                      Apt / Unit <span className="text-gray-400 font-normal">(optional)</span>
                    </label>
                    <input
                      name="unit"
                      value={formData.unit}
                      onChange={handleChange}
                      placeholder="Apt 4B"
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-white mb-2">
                      City <span className="text-red-500">*</span>
                    </label>
                    <input
                      name="city"
                      value={formData.city}
                      onChange={handleChange}
                      placeholder="Austin"
                      className={inputCls}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-white mb-2">State</label>
                    <input
                      name="state"
                      value={formData.state}
                      onChange={handleChange}
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-white mb-2">
                      ZIP <span className="text-red-500">*</span>
                    </label>
                    <input
                      name="zip"
                      value={formData.zip}
                      onChange={handleChange}
                      placeholder="78701"
                      inputMode="numeric"
                      className={inputCls}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-white mb-2">
                    Anything we should know?{' '}
                    <span className="text-gray-400 font-normal">(optional)</span>
                  </label>
                  <textarea
                    name="notes"
                    value={formData.notes}
                    onChange={(e) => {
                      if (error) setError('');
                      setFormData((prev) => ({ ...prev, notes: e.target.value }));
                    }}
                    rows={3}
                    placeholder="Gate code, pet hair, best days to reach you..."
                    className={inputCls}
                  />
                </div>
              </div>

              {/* Review */}
              <div className="rounded-2xl bg-gray-900 border border-gray-700 p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm uppercase tracking-wider text-gray-300">Car</span>
                  <span className="text-base text-white">
                    {selectedVehicle
                      ? `${selectedVehicle.year} ${selectedVehicle.make} ${selectedVehicle.model}`
                      : '-'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm uppercase tracking-wider text-gray-300">Service</span>
                  <span className="text-base text-white">{SERVICE_TYPE_NAMES[serviceType]}</span>
                </div>
                {formData.selectedAddOns.length > 0 && (
                  <div className="flex items-start justify-between gap-4">
                    <span className="text-sm uppercase tracking-wider text-gray-300">Extras</span>
                    <span className="text-base text-white text-right">
                      {formData.selectedAddOns
                        .map((id) => ADD_ONS.find((a) => a.id === id)?.name)
                        .filter(Boolean)
                        .join(', ')}
                    </span>
                  </div>
                )}
                <div className="border-t border-gray-700 pt-3 space-y-1.5">
                  <div className="flex justify-between text-sm text-gray-300">
                    <span>Subtotal</span>
                    <span>${pricing.subtotal.toFixed(2)}</span>
                  </div>
                  {pricing.discount > 0 && (
                    <div className="flex justify-between text-sm text-green-400">
                      <span>Returning-customer discount</span>
                      <span>-${pricing.discount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex items-baseline justify-between pt-1">
                    <span className="text-xs uppercase tracking-widest text-gray-300">
                      Total (paid on-site)
                    </span>
                    <span className="text-3xl font-bold text-white">
                      ${pricing.total.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-red-700/50 bg-red-950/30 p-4 text-sm text-red-100 leading-relaxed">
                No deposit and no payment now. Submit your request and we&apos;ll text you to lock in
                a time that works. You pay the total above on-site once the detail is done.
              </div>
            </div>
          )}

          {error && (
            <p className="mt-6 rounded-xl border border-red-600/50 bg-red-950/40 px-4 py-3 text-base text-red-200">
              {error}
            </p>
          )}

          <div className="mt-8 flex gap-3">
            {step > 1 && (
              <button
                type="button"
                onClick={() => setStep(step - 1)}
                disabled={isProcessing}
                className="flex-1 rounded-xl border border-white/20 bg-white/5 py-4 text-base font-semibold text-white hover:bg-white/10 disabled:opacity-50"
              >
                Back
              </button>
            )}
            {step === 1 ? (
              <button
                type="button"
                onClick={handleNext}
                className="flex-1 rounded-xl bg-red-600 py-4 text-base font-bold text-white hover:bg-red-500"
              >
                Next
              </button>
            ) : (
              <button
                type="submit"
                disabled={isProcessing || vehicles.length === 0}
                className="flex-1 rounded-xl bg-red-600 py-4 text-base font-bold text-white hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isProcessing ? 'Sending...' : 'Book my detail'}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
