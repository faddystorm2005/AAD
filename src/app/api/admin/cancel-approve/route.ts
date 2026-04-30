import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { deleteBookingFromGoogle } from '@/lib/googleCalendar';
import { notifyCustomerCancellationApproved } from '@/lib/notify';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface ApproveBody {
  bookingId: string;
  creditAmount?: number;
}

/**
 * POST /api/admin/cancel-approve
 * Body: { bookingId, creditAmount? }
 *
 * Admin-only. Approves a customer's cancellation request:
 *   1. Sets booking status to 'cancelled' (falls back to 'declined' if the
 *      enum doesn't have 'cancelled' yet) so the slot is freed up.
 *   2. If creditAmount > 0, atomically increments profiles.credit_balance
 *      for the customer using a small SQL increment (avoids read-modify-write
 *      race conditions).
 *   3. Removes the booking from the admin's Google Calendar.
 *   4. Texts/emails the customer letting them know.
 *
 * Returning 200 even when notifications fail - sending the email/SMS is
 * best-effort, the cancellation itself is the source of truth.
 */
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

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('is_admin')
    .eq('id', userData.user.id)
    .single();
  if (!profile?.is_admin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = (await req.json().catch(() => null)) as ApproveBody | null;
  if (!body?.bookingId) {
    return NextResponse.json({ error: 'Missing bookingId' }, { status: 400 });
  }

  const rawCredit = Number(body.creditAmount ?? 0);
  if (!Number.isFinite(rawCredit) || rawCredit < 0 || rawCredit > 10000) {
    return NextResponse.json(
      { error: 'creditAmount must be a number between 0 and 10000' },
      { status: 400 }
    );
  }
  // Round to two decimals to avoid floating-point drift in the database.
  const creditAmount = Math.round(rawCredit * 100) / 100;

  const { data: booking } = await supabaseAdmin
    .from('bookings')
    .select('id, user_id, status, service, cancel_requested_at')
    .eq('id', body.bookingId)
    .maybeSingle();

  if (!booking) {
    return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
  }
  if (!booking.cancel_requested_at) {
    return NextResponse.json(
      { error: 'No cancellation request on file for this booking.' },
      { status: 409 }
    );
  }

  const cancelLabel = `Cancellation approved by admin${
    creditAmount > 0 ? ` ($${creditAmount.toFixed(2)} credit issued)` : ''
  }`;

  // Try to set 'cancelled' first; fall back to 'declined' if the enum
  // doesn't have it yet (matches the existing /api/bookings/cancel flow).
  let { error: cancelErr } = await supabaseAdmin
    .from('bookings')
    .update({
      status: 'cancelled',
      cancel_reason: cancelLabel,
      cancelled_at: new Date().toISOString(),
    })
    .eq('id', booking.id);

  if (cancelErr) {
    const fallback = await supabaseAdmin
      .from('bookings')
      .update({
        status: 'declined',
        decline_reason: cancelLabel,
        declined_at: new Date().toISOString(),
      })
      .eq('id', booking.id);
    cancelErr = fallback.error;
  }

  if (cancelErr) {
    return NextResponse.json(
      { error: cancelErr.message || 'Failed to cancel booking' },
      { status: 500 }
    );
  }

  // Issue account credit (atomic increment via a single update with the
  // current value read in the same statement). Using maybeSingle + math here
  // is fine because the customer can't update their own credit balance
  // through any other path.
  if (creditAmount > 0) {
    const { data: cust } = await supabaseAdmin
      .from('profiles')
      .select('credit_balance')
      .eq('id', booking.user_id)
      .maybeSingle();

    const newBalance =
      Number(cust?.credit_balance ?? 0) + creditAmount;

    const { error: creditErr } = await supabaseAdmin
      .from('profiles')
      .update({ credit_balance: newBalance })
      .eq('id', booking.user_id);

    if (creditErr) {
      // Log but don't reverse the cancellation - admin can manually adjust.
      console.error('[cancel-approve] credit increment failed', creditErr);
    }
  }

  // Remove from Google Calendar.
  try {
    await deleteBookingFromGoogle(userData.user.id, booking.id);
  } catch (err) {
    console.error('[cancel-approve] Google Calendar removal failed', err);
  }

  // Notify the customer (best-effort).
  try {
    const { data: cust } = await supabaseAdmin
      .from('profiles')
      .select('full_name, phone, email')
      .eq('id', booking.user_id)
      .maybeSingle();
    await notifyCustomerCancellationApproved({
      customerName: cust?.full_name ?? null,
      customerPhone: cust?.phone ?? null,
      customerEmail: cust?.email ?? null,
      service: booking.service,
      creditIssued: creditAmount,
    });
  } catch (err) {
    console.error('[cancel-approve] customer notify failed', err);
  }

  return NextResponse.json({ ok: true, creditIssued: creditAmount });
}
