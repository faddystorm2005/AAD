'use client';

import { supabase } from '@/lib/supabaseClient';
import { SERVICES } from '@/lib/bookingPricing';

/**
 * Client-side read of a single booking, used by the confirmation page.
 *
 * This file used to also hold saveBooking, findExistingBooking,
 * generateIdempotencyKey and updateBookingPaymentStatus. All four were dead:
 * bookings are created server-side by /api/create-booking, and payment status
 * is recorded by /api/admin/mark-paid. updateBookingPaymentStatus in
 * particular wrote `deposit_paid`, which gates slot release in
 * /api/availability and the expire-approvals cron, so leaving an unused
 * client-callable writer for it was a hazard rather than a convenience.
 */
export async function getBooking(bookingId: string) {
  try {
    const { data, error } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', bookingId)
      .single();

    if (error) throw error;

    // Backward compatibility: older rows stored a size code in `service`
    // rather than the display name. Convert on read.
    if (data && (data.service === 'small' || data.service === 'suv' || data.service === 'truck')) {
      data.service = SERVICES[data.service as keyof typeof SERVICES].name;
    }

    return { success: true, booking: data };
  } catch (error) {
    console.error('Error fetching booking:', error);
    return { success: false, error };
  }
}
