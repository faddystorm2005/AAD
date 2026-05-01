'use client';

import { useState } from 'react';
import { useVehicles } from '@/contexts/VehicleContext';
import {
  VEHICLE_MAKES,
  ALL_MAKES,
  VEHICLE_YEARS,
  OTHER_MAKE_VALUE,
} from '@/lib/vehicleData';

interface AddVehicleFormProps {
  onClose: () => void;
}

const FIELD_CLASSES =
  'w-full rounded-xl border-2 border-gray-700 bg-gray-900 px-4 py-3 text-base text-white focus:border-red-500 focus:outline-none';
const FIELD_CLASSES_PLACEHOLDER = `${FIELD_CLASSES} placeholder-gray-500`;
const FIELD_CLASSES_DISABLED = `${FIELD_CLASSES} disabled:cursor-not-allowed disabled:opacity-50`;

export default function AddVehicleForm({ onClose }: AddVehicleFormProps) {
  const { addVehicle, loading } = useVehicles();
  const [error, setError] = useState('');
  // True when the user picked "Other / Not Listed" from the make dropdown.
  // While true, formData.make holds whatever the user typed (never the
  // OTHER_MAKE_VALUE sentinel) and model is a freeform text input too.
  const [useOtherMake, setUseOtherMake] = useState(false);
  const [formData, setFormData] = useState({
    year: 0, // 0 = nothing chosen yet; validates as falsy in handleSubmit
    make: '',
    model: '',
    size: 'small' as const,
    color: '',
    nickname: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'year' ? parseInt(value) || 0 : value,
    }));
  };

  const handleMakeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    if (value === OTHER_MAKE_VALUE) {
      // Switch to "Other" mode. Clear make + model so freeform inputs start empty.
      setUseOtherMake(true);
      setFormData((prev) => ({ ...prev, make: '', model: '' }));
    } else {
      // Real make picked (or empty placeholder). Reset model so a stale
      // selection from a different make doesn't carry over.
      setUseOtherMake(false);
      setFormData((prev) => ({ ...prev, make: value, model: '' }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.year || !formData.make || !formData.model || !formData.color) {
      setError('Please fill in the year, make, model, and color.');
      return;
    }

    const { error: submitError } = await addVehicle(formData);
    if (submitError) {
      setError(submitError.message);
    } else {
      onClose();
    }
  };

  // Dropdown shows the sentinel when useOtherMake is true; otherwise mirrors formData.make.
  const makeSelectValue = useOtherMake ? OTHER_MAKE_VALUE : formData.make;
  // Model options for the cascading dropdown. Empty when "Other" or no make.
  const modelOptions =
    !useOtherMake && formData.make ? VEHICLE_MAKES[formData.make] ?? [] : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 overflow-y-auto py-6 animate-fade-in">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-black p-6 sm:p-8 animate-scale-in">
        <div className="flex items-start justify-between gap-3 mb-2">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-red-500">
              Add a car
            </p>
            <h2 className="mt-1 text-2xl sm:text-3xl font-bold text-white">
              Tell us about your car
            </h2>
          </div>
          <button
            onClick={onClose}
            type="button"
            aria-label="Close add vehicle form"
            className="press shrink-0 rounded-full border border-white/20 bg-white/5 p-3 text-xl text-gray-300 hover:bg-white/10 hover:text-white"
          >
            ✕
          </button>
        </div>
        <p className="mb-6 text-base text-gray-300">
          We use this to size the detail and remember it for next time.
        </p>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="vehicle-year" className="block text-base font-semibold text-white mb-2">
                Year <span className="text-red-500">*</span>
              </label>
              <select
                id="vehicle-year"
                name="year"
                value={formData.year ? String(formData.year) : ''}
                onChange={handleChange}
                className={FIELD_CLASSES}
              >
                <option value="">Select year</option>
                {VEHICLE_YEARS.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="vehicle-size" className="block text-base font-semibold text-white mb-2">
                Size <span className="text-red-500">*</span>
              </label>
              <select
                id="vehicle-size"
                name="size"
                value={formData.size}
                onChange={handleChange}
                className={FIELD_CLASSES}
              >
                <option value="small">Small Sedan / Coupe</option>
                <option value="suv">SUV</option>
                <option value="truck">Truck / 3-Row</option>
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="vehicle-make" className="block text-base font-semibold text-white mb-2">
              Make <span className="text-red-500">*</span>
            </label>
            <select
              id="vehicle-make"
              name="make"
              value={makeSelectValue}
              onChange={handleMakeChange}
              className={FIELD_CLASSES}
            >
              <option value="">Select make</option>
              {ALL_MAKES.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
              <option value={OTHER_MAKE_VALUE}>Other / Not Listed</option>
            </select>
          </div>

          {useOtherMake && (
            <div>
              <label htmlFor="vehicle-make-other" className="block text-base font-semibold text-white mb-2">
                Make name <span className="text-red-500">*</span>
              </label>
              <input
                id="vehicle-make-other"
                type="text"
                name="make"
                value={formData.make}
                onChange={handleChange}
                placeholder="Type the make"
                autoComplete="off"
                className={FIELD_CLASSES_PLACEHOLDER}
              />
            </div>
          )}

          <div>
            <label htmlFor="vehicle-model" className="block text-base font-semibold text-white mb-2">
              Model <span className="text-red-500">*</span>
            </label>
            {useOtherMake ? (
              <input
                id="vehicle-model"
                type="text"
                name="model"
                value={formData.model}
                onChange={handleChange}
                placeholder="Type the model"
                autoComplete="off"
                className={FIELD_CLASSES_PLACEHOLDER}
              />
            ) : (
              <select
                id="vehicle-model"
                name="model"
                value={formData.model}
                onChange={handleChange}
                disabled={!formData.make}
                className={FIELD_CLASSES_DISABLED}
              >
                <option value="">
                  {formData.make ? 'Select model' : 'Pick a make first'}
                </option>
                {modelOptions.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div>
            <label htmlFor="vehicle-color" className="block text-base font-semibold text-white mb-2">
              Color <span className="text-red-500">*</span>
            </label>
            <input
              id="vehicle-color"
              type="text"
              name="color"
              value={formData.color}
              onChange={handleChange}
              placeholder="Silver"
              autoComplete="off"
              className={FIELD_CLASSES_PLACEHOLDER}
            />
          </div>

          <div>
            <label htmlFor="vehicle-nickname" className="block text-base font-semibold text-white mb-2">
              Nickname <span className="text-gray-400 text-sm font-normal">(optional)</span>
            </label>
            <input
              id="vehicle-nickname"
              type="text"
              name="nickname"
              value={formData.nickname}
              onChange={handleChange}
              placeholder="Daily driver"
              autoComplete="off"
              className={FIELD_CLASSES_PLACEHOLDER}
            />
          </div>

          {error && (
            <div role="alert" className="rounded-xl border-2 border-red-700 bg-red-900/40 p-4 text-base text-red-100">
              {error}
            </div>
          )}

          <div className="flex flex-col-reverse gap-3 pt-4 sm:flex-row">
            <button
              type="button"
              onClick={onClose}
              className="press flex-1 rounded-xl border-2 border-gray-600 px-5 py-4 text-base font-semibold text-white hover:bg-gray-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary press flex-1 rounded-xl px-5 py-4 text-base font-semibold disabled:opacity-50"
            >
              {loading ? 'Adding…' : 'Add this car'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
