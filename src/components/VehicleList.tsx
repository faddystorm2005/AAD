'use client';

import { useVehicles } from '@/contexts/VehicleContext';
import { useDialog } from '@/contexts/DialogContext';

interface VehicleListProps {
  onSelectVehicle?: (vehicleId: string) => void;
}

export default function VehicleList({ onSelectVehicle }: VehicleListProps) {
  const { vehicles, loading, deleteVehicle } = useVehicles();
  const showDialog = useDialog();

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
      <div className="rounded-xl border-2 border-dashed border-gray-600 p-8 text-center">
        <p className="text-lg font-semibold text-gray-100">No cars saved yet</p>
        <p className="mt-2 text-base text-gray-300">
          Tap &ldquo;+ Add Vehicle&rdquo; above to add your first one.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {vehicles.map((vehicle, i) => (
        <div
          key={vehicle.id}
          className="lift-hover animate-fade-up rounded-xl border border-gray-600 bg-gray-800 p-5"
          style={{ animationDelay: `${i * 60}ms` }}
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-lg font-semibold text-white">
                  {vehicle.year} {vehicle.make} {vehicle.model}
                </h3>
                {vehicle.nickname && (
                  <span className="text-xs font-semibold uppercase tracking-wider bg-red-600 text-white px-2.5 py-1 rounded-full">
                    {vehicle.nickname}
                  </span>
                )}
              </div>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-base text-gray-200">
                <span>{vehicle.size === 'small' ? 'Small Sedan / Coupe' : vehicle.size === 'suv' ? 'SUV' : 'Truck / 3-Row'}</span>
                <span>·</span>
                <span>{vehicle.color}</span>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {onSelectVehicle && (
                <button
                  onClick={() => onSelectVehicle(vehicle.id)}
                  className="btn-primary press rounded-lg px-4 py-2 text-sm font-semibold"
                >
                  Select
                </button>
              )}
              <button
                onClick={async () => {
                  const ok = await showDialog({
                    title: `Remove your ${vehicle.year} ${vehicle.make} ${vehicle.model}?`,
                    confirmLabel: 'Remove',
                    danger: true,
                  });
                  if (ok) deleteVehicle(vehicle.id);
                }}
                className="press rounded-lg border-2 border-red-600/60 px-4 py-2 text-sm font-semibold text-red-300 hover:bg-red-900/30"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
