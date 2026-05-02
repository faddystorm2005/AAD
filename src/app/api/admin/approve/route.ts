import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { createPaymentLink as createSquarePaymentLink } from '@/lib/squarePayment';
import { createPaymentLink as createPayPalPaymentLink } from '@/lib/paypalPayment';
import { pushBookingToGoogle } from '@/lib/googleCalendar';
import { sendPushToCustomer } from '@/lib/pushNotifications';
import { notifyCustomerBookingApproved } from '@/lib/notify';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface ApproveBody {
  bookingId: string;
  origin: string; // e.g. https://abc.ngrok-free.dev
}

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
  if (!body?.bookingId || !body.origin) {
    return NextResponse.json({ error: 'Missing bookingId or origin' }, { status: 400 });
  }

  const { data: booking, error: getErr } = await supabaseAdmin
    .from('bookings')
    .select(`id, status, deposit_amount, service, deposit_paid,
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

  // Kill-switch: PAYMENT_PROCESSOR env var picks the processor at request
  // time. Defaults to "square" so existing flow keeps working until the
  // env var is explicitly flipped to "paypal".
  const processor = (process.env.PAYMENT_PROCESSOR || 'square').toLowerCase();
  const createLink =
    processor === 'paypal' ? createPayPalPaymentLink : createSquarePaymentLink;

  let paymentUrl: string;
  try {
    const result = await createLink(
      Math.round(Number(booking.deposit_amount) * 100),
      `AAD Detailing Deposit - ${booking.service}`,
      booking.id,
      `${body.origin}/booking-confirmation/${booking.id}`
    );
    paymentUrl = result.url;
  } catch (err: any) {
    const raw = err?.message || '';
    const hint =
      raw.toLowerCase().includes('unauthorized') || raw.toLowerCase().includes('401')
        ? `${processor === 'paypal' ? 'PayPal' : 'Square'} credentials rejected -- check ${processor === 'paypal' ? 'PAYPAL_CLIENT_ID / PAYPAL_CLIENT_SECRET / PAYPAL_ENVIRONMENT' : 'SQUARE_ACCESS_TOKEN / SQUARE_ENVIRONMENT'} in Vercel. Also confirm PAYMENT_PROCESSOR=${processor} is set. Original: ${raw}`
        : raw || `Failed to create ${processor === 'paypal' ? 'PayPal' : 'Square'} payment link`;
    return NextResponse.json({ error: hint }, { status: 500 });
  }

  const { error: updateErr } = await supabaseAdmin
    .from('bookings')
    .update({
      status: 'approved',
      payment_url: paymentUrl,
      approved_at: new Date().toISOString(),
    })
    .eq('id', body.bookingId);

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 });
  }

  // Push to Google Calendar (best-effort, non-blocking).
  await pushBookingToGoogle(userData.user.id, body.bookingId);

  // Notify customer via push (best-effort).
  try {
    await sendPushToCustomer(body.bookingId, {
      title: 'Booking approved',
      body: 'Your detailing appointment has been approved. Tap to pay your deposit and lock in your slot.',
      url: `/booking-confirmation/${body.bookingId}`,
      tag: `booking-approved-${body.bookingId}`,
    });
  } catch (err) {
    console.error('[push] customer approve notification failed', err);
  }

  // SMS + email fallback so customers without push still get notified (best-effort).
  try {
    const customer = (booking as any).customer;
    await notifyCustomerBookingApproved({
      customerName: customer?.full_name ?? null,
      customerPhone: customer?.phone ?? null,
      customerEmail: customer?.email ?? null,
      service: booking.service,
      depositAmount: Number(booking.deposit_amount),
      paymentUrl,
    });
  } catch (err) {
    console.error('[notify] customer approve sms/email failed', err);
  }

  return NextResponse.json({ ok: true, paymentUrl });
}
