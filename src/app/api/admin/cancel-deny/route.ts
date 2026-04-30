import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { notifyCustomerCancellationDenied } from '@/lib/notify';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface DenyBody {
  bookingId: string;
  note?: string;
}

/**
 * POST /api/admin/cancel-deny
 * Body: { bookingId, note? }
 *
 * Admin-only. Denies a customer's cancellation request:
 *   1. Clears cancel_requested_at and cancel_request_reason on the booking.
 *      Status is unchanged - the booking continues as scheduled.
 *   2. Texts/emails the customer with the optional admin note.
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

  const body = (await req.json().catch(() => null)) as DenyBody | null;
  if (!body?.bookingId) {
    return NextResponse.json({ error: 'Missing bookingId' }, { status: 400 });
  }
  const note = (body.note ?? '').toString().trim().slice(0, 500);

  const { data: booking } = await supabaseAdmin
    .from('bookings')
    .select('id, user_id, service, cancel_requested_at')
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

  const { error: updateErr } = await supabaseAdmin
    .from('bookings')
    .update({
      cancel_requested_at: null,
      cancel_request_reason: null,
    })
    .eq('id', booking.id);

  if (updateErr) {
    return NextResponse.json(
      { error: updateErr.message || 'Failed to deny request' },
      { status: 500 }
    );
  }

  // Notify the customer (best-effort).
  try {
    const { data: cust } = await supabaseAdmin
      .from('profiles')
      .select('full_name, phone, email')
      .eq('id', booking.user_id)
      .maybeSingle();
    await notifyCustomerCancellationDenied({
      customerName: cust?.full_name ?? null,
      customerPhone: cust?.phone ?? null,
      customerEmail: cust?.email ?? null,
      service: booking.service,
      note: note || null,
    });
  } catch (err) {
    console.error('[cancel-deny] customer notify failed', err);
  }

  return NextResponse.json({ ok: true });
}
