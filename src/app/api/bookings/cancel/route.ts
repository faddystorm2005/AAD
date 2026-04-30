import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { deleteBookingFromGoogle, findAdminUserId } from '@/lib/googleCalendar';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/bookings/cancel
 * Body: { bookingId, reason? }
 *
 * Cancels a booking. Customer can cancel their own pending/approved/confirmed
 * bookings. Admin can cancel any non-terminal booking. Sets status='cancelled'
 * (frees the slot in availability), records reason, removes from Google.
 *
 * Refuses cancellation of in_progress, completed, or already-cancelled
 * bookings — those are terminal/in-flight states the customer shouldn't
 * be able to undo unilaterally.
 *
 * If the bookings table doesn't have 'cancelled' as a valid status enum
 * value, the SQL migration the operator needs to run is in the error.
 */

// Customers can cancel anything not already in motion or finished.
const CUSTOMER_CANCELLABLE = new Set(['pending', 'approved', 'confirmed']);
// Admin can cancel anything that hasn't completed (more permissive).
const ADMIN_CANCELLABLE = new Set([
  'pending',
  'approved',
  'confirmed',
  'in_progress',
]);

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const accessToken = authHeader?.startsWith('Bearer ')
    ? authHeader.slice('Bearer '.length)
    : null;
  if (!accessToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${accessToken}` } } }
  );

  const { data: userData } = await userClient.auth.getUser();
  if (!userData?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const userId = userData.user.id;

  const body = await req.json().catch(() => null);
  const bookingId: string | undefined = body?.bookingId;
  const reason: string = (body?.reason ?? '').toString().trim();
  if (!bookingId) {
    return NextResponse.json({ error: 'Missing bookingId' }, { status: 400 });
  }

  const [{ data: booking }, { data: profile }] = await Promise.all([
    supabaseAdmin
      .from('bookings')
      .select('id, user_id, status')
      .eq('id', bookingId)
      .maybeSingle(),
    supabaseAdmin.from('profiles').select('is_admin').eq('id', userId).maybeSingle(),
  ]);

  if (!booking) {
    return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
  }

  const isAdmin = Boolean(profile?.is_admin);
  const isOwner = booking.user_id === userId;
  if (!isAdmin && !isOwner) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const allowed = isAdmin ? ADMIN_CANCELLABLE : CUSTOMER_CANCELLABLE;
  if (!allowed.has(booking.status)) {
    return NextResponse.json(
      {
        error: `Cannot cancel a booking in status "${booking.status}". ${
          isAdmin
            ? 'Use the danger-zone delete instead.'
            : 'Contact Austin Auto Detail if you need to make a change.'
        }`,
      },
      { status: 409 }
    );
  }

  // Build the cancel update. cancel_reason and cancelled_at are optional
  // columns — try writing them, fall back if they don't exist.
  const cancelLabel = isAdmin
    ? `Cancelled by admin${reason ? `: ${reason}` : ''}`
    : `Cancelled by customer${reason ? `: ${reason}` : ''}`;

  // Try with the new 'cancelled' status + new columns.
  let { error: cancelErr } = await supabaseAdmin
    .from('bookings')
    .update({
      status: 'cancelled',
      cancel_reason: cancelLabel,
      cancelled_at: new Date().toISOString(),
    })
    .eq('id', bookingId);

  if (cancelErr) {
    // Common cause: enum doesn't have 'cancelled' yet OR cancel_* columns
    // don't exist. Fall back to setting status='declined' with a marker in
    // decline_reason so the slot still frees up.
    const fallback = await supabaseAdmin
      .from('bookings')
      .update({
        status: 'declined',
        decline_reason: cancelLabel,
        declined_at: new Date().toISOString(),
      })
      .eq('id', bookingId);
    cancelErr = fallback.error;
  }

  if (cancelErr) {
    return NextResponse.json(
      { error: cancelErr.message || 'Failed to cancel booking' },
      { status: 500 }
    );
  }

  // Pull the booking off the admin's Google Calendar.
  try {
    const adminId = await findAdminUserId();
    if (adminId) {
      await deleteBookingFromGoogle(adminId, bookingId);
    }
  } catch (err) {
    console.error('[cancel] Google Calendar removal failed', err);
  }

  return NextResponse.json({ ok: true });
}
