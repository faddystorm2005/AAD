import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { notifyAdminCancellationRequest } from '@/lib/notify';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/bookings/cancel-request
 * Body: { bookingId, reason? }
 *
 * Customer-facing: records that the customer wants out of a booking and
 * notifies the admin. The booking's status is NOT changed - it stays in
 * pending/approved/confirmed until the admin approves or denies the
 * request. This gives the admin a chance to talk it through and decide
 * whether to issue an account credit (vs. just declining outright).
 *
 * Customers cannot cancel directly anymore - they must request and wait.
 */

const REQUESTABLE = new Set(['pending', 'approved', 'confirmed']);

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
  const reason: string = (body?.reason ?? '').toString().trim().slice(0, 500);
  if (!bookingId) {
    return NextResponse.json({ error: 'Missing bookingId' }, { status: 400 });
  }

  const { data: booking } = await supabaseAdmin
    .from('bookings')
    .select('id, user_id, status, service, scheduled_at, address, cancel_requested_at')
    .eq('id', bookingId)
    .maybeSingle();

  if (!booking) {
    return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
  }

  if (booking.user_id !== userId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  if (!REQUESTABLE.has(booking.status)) {
    return NextResponse.json(
      {
        error: `This booking is already ${booking.status} and cannot be cancelled. Contact us if you need help.`,
      },
      { status: 409 }
    );
  }

  if (booking.cancel_requested_at) {
    return NextResponse.json(
      { error: 'A cancellation request is already on file for this booking.' },
      { status: 409 }
    );
  }

  const { error: updateErr } = await supabaseAdmin
    .from('bookings')
    .update({
      cancel_requested_at: new Date().toISOString(),
      cancel_request_reason: reason || null,
    })
    .eq('id', bookingId);

  if (updateErr) {
    return NextResponse.json(
      { error: updateErr.message || 'Failed to record cancellation request' },
      { status: 500 }
    );
  }

  // Look up the customer's name + phone for the admin notification.
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('full_name, phone, email')
    .eq('id', userId)
    .maybeSingle();

  // Best-effort - don't fail the request if SMS doesn't go out.
  try {
    await notifyAdminCancellationRequest({
      bookingId: booking.id,
      customerName: profile?.full_name ?? profile?.email ?? null,
      customerPhone: profile?.phone ?? null,
      service: booking.service,
      scheduledAt: booking.scheduled_at,
      reason: reason || null,
    });
  } catch (err) {
    console.error('[cancel-request] admin notify failed', err);
  }

  return NextResponse.json({ ok: true });
}
