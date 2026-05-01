'use client';

import { supabase } from '@/lib/supabaseClient';
import { BookingData, SERVICES } from '@/lib/bookingPricing';

export interface SavedBooking {
  id: string;
  user_id: string;
  vehicle_id: string;
  size: string;
  service: string;
  addons: any[];
  scheduled_at: string;
  address: string;
  unit?: string | null;
  city: string;
  state: string;
  zip: string;
  deposit_amount: number;
  deposit_paid: boolean;
  discount_applied: boolean;
  subtotal: number;
  total: number;
  booking_stage: string;
  created_at: string;
  updated_at: string;
}

/**
 * Generates a unique idempotency key for a booking.
 * Prevents duplicate bookings if user retries after payment failure.
 */
function generateIdempotencyKey(
  userId: string,
  vehicleId: string,
  scheduledAt: string,
  address: string
): string {
  const key = `${userId}|${vehicleId}|${scheduledAt}|${address}`;
  // Create a hash-like string from the key
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    const char = key.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36).substring(0, 16);
}

/**
 * Checks for existing unpaid booking with the same idempotency key.
 * Used to prevent duplicate bookings on retry.
 */
async function findExistingBooking(
  userId: string,
  vehicleId: string,
  scheduledAt: string,
  address: string
) {
  try {
    const { data, error } = await supabase
      .from('bookings')
      .select('*')
      .eq('user_id', userId)
      .eq('vehicle_id', vehicleId)
      .eq('scheduled_at', scheduledAt)
      .eq('address', address)
      .eq('deposit_paid', false) // Only check unpaid bookings
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error?.code === 'PGRST116') {
      // No rows returned - this is expected
      return null;
    }
    if (error) throw error;

    return data;
  } catch (error: any) {
    // If error is "no rows", return null
    if (error?.message?.includes('no rows')) {
      return null;
    }
    throw error;
  }
}

export async function saveBooking(
  userId: string,
  bookingData: BookingData & { pricing: any }
): Promise<{ success: boolean; booking?: SavedBooking; error?: any; isIdempotent?: boolean }> {
  try {
    // Check for existing unpaid booking with same details (idempotency)
    const existingBooking = await findExistingBooking(
      userId,
      bookingData.vehicleId,
      bookingData.scheduledAt,
      bookingData.address
    );

    if (existingBooking) {
      console.log('Existing unpaid booking found, returning it instead of creating a duplicate');
      return { success: true, booking: existingBooking, isIdempotent: true };
    }

    const { data, error } = await supabase.from('bookings').insert({
      user_id: userId,
      vehicle_id: bookingData.vehicleId,
      size: bookingData.serviceSize,
      service: SERVICES[bookingData.serviceSize].name,
      addons: bookingData.selectedAddOns,
      scheduled_at: bookingData.scheduledAt,
      address: bookingData.address,
      city: bookingData.city,
      state: bookingData.state,
      zip: bookingData.zip,
      deposit_amount: bookingData.pricing.deposit,
      deposit_paid: false,
      discount_applied: false,
      subtotal: bookingData.pricing.subtotal,
      total: bookingData.pricing.total,
      booking_stage: 'requested',
    }).select().single();

    if (error) throw error;

    return { success: true, booking: data };
  } catch (error: any) {
    console.error('Error saving booking:', error);
    return { success: false, error };
  }
}

export async function updateBookingPaymentStatus(bookingId: string, paid: boolean) {
  try {
    const { error } = await supabase
      .from('bookings')
      .update({ deposit_paid: paid })
      .eq('id', bookingId);

    if (error) throw error;
    return { success: true };
  } catch (error: any) {
    console.error('Error updating booking:', error);
    return { success: false, error };
  }
}

export async function getBooking(bookingId: string) {
  try {
    const { data, error } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', bookingId)
      .single();

    if (error) throw error;
    
    // Handle backward compatibility: if service is a size code, convert it to the full name
    if (data && (data.service === 'small' || data.service === 'suv' || data.service === 'truck')) {
      data.service = SERVICES[data.service as keyof typeof SERVICES].name;
    }
    
    return { success: true, booking: data };
  } catch (error: any) {
    console.error('Error fetching booking:', error);
    return { success: false, error };
  }
}
