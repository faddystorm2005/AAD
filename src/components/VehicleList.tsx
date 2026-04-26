'use client';

import { useVehicles } from '@/contexts/VehicleContext';

interface VehicleListProps {
  onSelectVehicle?: (vehicleId: string) => void;
}

export default function VehicleList({ onSelectVehicle }: VehicleListProps) {
  const { vehicles, loading, deleteVehicle } = useVehicles();

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2].map((i) => (
          <div key={i} className="h-24 rounded-lg bg-gray-800 animate-pulse" />
        ))}
      </div>
    );
  }

  if (vehicles.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-gray-600 p-6 text-center">
        <p className="text-gray-400">No vehicles saved yet</p>
        <p className="text-sm text-gray-500 mt-1">Add your first vehicle to get started</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {vehicles.map((vehicle, i) => (
        <div
          key={vehicle.id}
          className="lift-hover animate-fade-up rounded-lg border border-gray-600 bg-gray-800 p-4"
          style={{ animationDelay: `${i * 60}ms` }}
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-white">
                  {vehicle.year} {vehicle.make} {vehicle.model}
                </h3>
                {vehicle.nickname && (
                  <span className="text-xs bg-red-600 text-white px-2 py-1 rounded">
                    {vehicle.nickname}
                  </span>
                )}
              </div>
              <div className="mt-2 flex gap-4 text-sm text-gray-400">
                <span>Size: {vehicle.size === 'small' ? 'Small Sedan' : vehicle.size === 'suv' ? 'SUV' : 'Truck/3-Row'}</span>
                <span>Color: {vehicle.color}</span>
              </div>
            </div>
            <div className="flex gap-2">
              {onSelectVehicle && (
                <button
                  onClick={() => onSelectVehicle(vehicle.id)}
                  className="press text-sm px-3 py-1 rounded bg-red-600 text-white hover:bg-red-700"
                >
                  Select
                </button>
              )}
              <button
                onClick={() => deleteVehicle(vehicle.id)}
                className="press text-sm px-3 py-1 rounded border border-red-600 text-red-600 hover:bg-red-600/10"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
