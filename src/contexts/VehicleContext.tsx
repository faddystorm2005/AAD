'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from './AuthContext';
import { errorMessage } from '@/lib/errors';

export interface Vehicle {
  id: string;
  user_id: string;
  year: number;
  make: string;
  model: string;
  size: 'small' | 'suv' | 'truck';
  color: string;
  nickname?: string;
  created_at: string;
}

interface VehicleContextType {
  vehicles: Vehicle[];
  loading: boolean;
  error: string | null;
  // These return a ready-to-display message rather than a raw error object.
  // They used to return whatever was caught, which could be a string in the
  // not-signed-in path and a PostgrestError otherwise, so callers reading
  // `.message` silently showed nothing for the string case.
  addVehicle: (data: Omit<Vehicle, 'id' | 'user_id' | 'created_at'>) => Promise<{ error: string | null }>;
  updateVehicle: (id: string, data: Partial<Vehicle>) => Promise<{ error: string | null }>;
  deleteVehicle: (id: string) => Promise<{ error: string | null }>;
  refreshVehicles: () => Promise<void>;
}

const VehicleContext = createContext<VehicleContextType | undefined>(undefined);

export function VehicleProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchVehicles = useCallback(async () => {
    if (!user) {
      setVehicles([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const { data, error: fetchError } = await supabase
        .from('vehicles')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      setVehicles(data || []);
    } catch (err) {
      setError(errorMessage(err));
      console.error('Error fetching vehicles:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    // Reloads the vehicle list when the signed-in user changes.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchVehicles();
  }, [fetchVehicles]);

  const addVehicle = async (data: Omit<Vehicle, 'id' | 'user_id' | 'created_at'>) => {
    if (!user) return { error: 'You are not signed in.' };

    try {
      const { error: insertError } = await supabase
        .from('vehicles')
        .insert({
          ...data,
          user_id: user.id,
        });

      if (insertError) throw insertError;
      await fetchVehicles();
      return { error: null };
    } catch (err) {
      const message = errorMessage(err, 'Could not save that vehicle.');
      setError(message);
      return { error: message };
    }
  };

  const updateVehicle = async (id: string, data: Partial<Vehicle>) => {
    try {
      const { error: updateError } = await supabase
        .from('vehicles')
        .update(data)
        .eq('id', id);

      if (updateError) throw updateError;
      await fetchVehicles();
      return { error: null };
    } catch (err) {
      const message = errorMessage(err, 'Could not update that vehicle.');
      setError(message);
      return { error: message };
    }
  };

  const deleteVehicle = async (id: string) => {
    try {
      const { error: deleteError } = await supabase
        .from('vehicles')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;
      await fetchVehicles();
      return { error: null };
    } catch (err) {
      const message = errorMessage(err, 'Could not remove that vehicle.');
      setError(message);
      return { error: message };
    }
  };

  const refreshVehicles = async () => {
    await fetchVehicles();
  };

  const value = {
    vehicles,
    loading,
    error,
    addVehicle,
    updateVehicle,
    deleteVehicle,
    refreshVehicles,
  };

  return <VehicleContext.Provider value={value}>{children}</VehicleContext.Provider>;
}

export function useVehicles() {
  const context = useContext(VehicleContext);
  if (context === undefined) {
    throw new Error('useVehicles must be used within a VehicleProvider');
  }
  return context;
}
