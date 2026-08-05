import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { sendPushToCustomer } from '@/lib/pushNotifications';
import { notifyCustomerBookingApproved } from '@/lib/notify';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface ApproveBody {
  bookingId: string;
  origin: string;
}

/**
 * Approve a detail request. Simplified model: NO deposit and NO payment link.
 * Approving just confirms the request; Signature Mobile Detailing then texts the
 * customer to arrange a time, and the full amount is paid on-site. Because no
 * deposit is owed, we do NOT set expires_at, so the expire-approvals cron
 * (which only touches rows with a non-null expires_at) leaves these alone.
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

  const { data: userData, error: userError } = await userClient.auth.getUser();
  if (userError || !userData?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('is_admin')
    .eq('id', userData.user.id)
    .single();

  if (!profile?.is_admin) {
    return NextResponse.json(
      { error: 'Forbidden: your account is not an admin' },
      { status: 403 }
    );
  }

  const body = (await req.json().catch(() => null)) as ApproveBody | null;
  if (!body?.bookingId) {
    return NextResponse.json({ error: 'Missing bookingId' }, { status: 400 });
  }

  const { data: booking, error: getErr } = await supabaseAdmin
    .from('bookings')
    .select(`id, status, service,
             customer:profiles!user_id(full_name, phone, email)`)
    .eq('id', body.bookingId)
    .single();

  if (getErr || !booking) {
    return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
  }
  if (booking.status !== 'pending') {
    return NextResponse.json(
      { error: `Cannot approve a booking in status "${booking.status}"` },
      { status: 409 }
    );
  }

  // Approve outright. No payment link, no expiry. Mark deposit_paid true so any
  // legacy logic that keys on it treats the booking as fully settled up-front
  // (there is no deposit to collect).
  const approvedAt = new Date();
  const { error: updateErr } = await supabaseAdmin
    .from('bookings')
    .update({
      status: 'approved',
      approved_at: approvedAt.toISOString(),
      deposit_paid: true,
    })
    .eq('id', body.bookingId);

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 });
  }

  // Notify customer via push (best-effort).
  try {
    await sendPushToCustomer(body.bookingId, {
      title: 'Request approved',
      body: "You're approved! We'll text you shortly to lock in a time. No deposit - pay on-site.",
      url: `/booking-confirmation/${body.bookingId}`,
      tag: `booking-approved-${body.bookingId}`,
    });
  } catch (err) {
    console.error('[push] customer approve notification failed', err);
  }

  // SMS + email fallback (best-effort).
  try {
    const customer = (booking as any).customer;
    await notifyCustomerBookingApproved({
      customerName: customer?.full_name ?? null,
      customerPhone: customer?.phone ?? null,
      customerEmail: customer?.email ?? null,
      service: booking.service,
    });
  } catch (err) {
    console.error('[notify] customer approve sms/email failed', err);
  }

  return NextResponse.json({ ok: true });
}
