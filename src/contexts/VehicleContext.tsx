'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from './AuthContext';

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
  addVehicle: (data: Omit<Vehicle, 'id' | 'user_id' | 'created_at'>) => Promise<{ error?: any }>;
  updateVehicle: (id: string, data: Partial<Vehicle>) => Promise<{ error?: any }>;
  deleteVehicle: (id: string) => Promise<{ error?: any }>;
  refreshVehicles: () => Promise<void>;
}

const VehicleContext = createContext<VehicleContextType | undefined>(undefined);

export function VehicleProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchVehicles = async () => {
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
    } catch (err: any) {
      setError(err.message);
      console.error('Error fetching vehicles:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVehicles();
  }, [user]);

  const addVehicle = async (data: Omit<Vehicle, 'id' | 'user_id' | 'created_at'>) => {
    if (!user) return { error: 'Not authenticated' };

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
    } catch (err: any) {
      setError(err.message);
      return { error: err };
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
    } catch (err: any) {
      setError(err.message);
      return { error: err };
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
    } catch (err: any) {
      setError(err.message);
      return { error: err };
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
