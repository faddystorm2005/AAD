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
      setError('Please fill in all required fields');
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-6 animate-fade-in">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-black p-8 animate-scale-in">
        <h2 className="text-2xl font-bold text-white mb-6">Add Vehicle</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Year <span className="text-red-600">*</span>
              </label>
              <input
                type="number"
                name="year"
                value={formData.year}
                onChange={handleChange}
                min="1990"
                max={new Date().getFullYear() + 1}
                className="w-full rounded-lg border border-gray-600 bg-gray-800 px-3 py-2 text-white focus:border-red-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Size <span className="text-red-600">*</span>
              </label>
              <select
                name="size"
                value={formData.size}
                onChange={handleChange}
                className="w-full rounded-lg border border-gray-600 bg-gray-800 px-3 py-2 text-white focus:border-red-500 focus:outline-none"
              >
                <option value="small">Small Sedan</option>
                <option value="suv">SUV</option>
                <option value="truck">Truck/3-Row</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Make <span className="text-red-600">*</span>
            </label>
            <input
              type="text"
              name="make"
              value={formData.make}
              onChange={handleChange}
              placeholder="e.g., Toyota"
              className="w-full rounded-lg border border-gray-600 bg-gray-800 px-3 py-2 text-white placeholder-gray-500 focus:border-red-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Model <span className="text-red-600">*</span>
            </label>
            <input
              type="text"
              name="model"
              value={formData.model}
              onChange={handleChange}
              placeholder="e.g., Camry"
              className="w-full rounded-lg border border-gray-600 bg-gray-800 px-3 py-2 text-white placeholder-gray-500 focus:border-red-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Color <span className="text-red-600">*</span>
            </label>
            <input
              type="text"
              name="color"
              value={formData.color}
              onChange={handleChange}
              placeholder="e.g., Silver"
              className="w-full rounded-lg border border-gray-600 bg-gray-800 px-3 py-2 text-white placeholder-gray-500 focus:border-red-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Nickname (optional)
            </label>
            <input
              type="text"
              name="nickname"
              value={formData.nickname}
              onChange={handleChange}
              placeholder="e.g., Daily Driver"
              className="w-full rounded-lg border border-gray-600 bg-gray-800 px-3 py-2 text-white placeholder-gray-500 focus:border-red-500 focus:outline-none"
            />
          </div>

          {error && (
            <div className="rounded-lg bg-red-900/50 border border-red-700 p-3 text-sm text-red-200">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-gray-600 px-4 py-2 text-white hover:bg-gray-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 rounded-lg bg-red-600 px-4 py-2 text-white hover:bg-red-700 disabled:opacity-50"
            >
              {loading ? 'Adding...' : 'Add Vehicle'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
