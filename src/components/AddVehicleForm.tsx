'use client';

import { useState } from 'react';
import { useVehicles } from '@/contexts/VehicleContext';

interface AddVehicleFormProps {
  onClose: () => void;
}

export default function AddVehicleForm({ onClose }: AddVehicleFormProps) {
  const { addVehicle, loading } = useVehicles();
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    year: new Date().getFullYear(),
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
      [name]: name === 'year' ? parseInt(value) : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.make || !formData.model || !formData.color) {
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
              <input
                id="vehicle-year"
                type="number"
                name="year"
                value={formData.year}
                onChange={handleChange}
                min="1990"
                max={new Date().getFullYear() + 1}
                inputMode="numeric"
                className="w-full rounded-xl border-2 border-gray-700 bg-gray-900 px-4 py-3 text-base text-white focus:border-red-500 focus:outline-none"
              />
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
                className="w-full rounded-xl border-2 border-gray-700 bg-gray-900 px-4 py-3 text-base text-white focus:border-red-500 focus:outline-none"
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
            <input
              id="vehicle-make"
              type="text"
              name="make"
              value={formData.make}
              onChange={handleChange}
              placeholder="Toyota"
              autoComplete="off"
              className="w-full rounded-xl border-2 border-gray-700 bg-gray-900 px-4 py-3 text-base text-white placeholder-gray-500 focus:border-red-500 focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="vehicle-model" className="block text-base font-semibold text-white mb-2">
              Model <span className="text-red-500">*</span>
            </label>
            <input
              id="vehicle-model"
              type="text"
              name="model"
              value={formData.model}
              onChange={handleChange}
              placeholder="Camry"
              autoComplete="off"
              className="w-full rounded-xl border-2 border-gray-700 bg-gray-900 px-4 py-3 text-base text-white placeholder-gray-500 focus:border-red-500 focus:outline-none"
            />
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
              className="w-full rounded-xl border-2 border-gray-700 bg-gray-900 px-4 py-3 text-base text-white placeholder-gray-500 focus:border-red-500 focus:outline-none"
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
              className="w-full rounded-xl border-2 border-gray-700 bg-gray-900 px-4 py-3 text-base text-white placeholder-gray-500 focus:border-red-500 focus:outline-none"
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
