import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { createPaymentLink } from '@/lib/squarePayment';
import { pushBookingToGoogle } from '@/lib/googleCalendar';

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
    .select('id, status, deposit_amount, service, deposit_paid')
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

  let paymentUrl: string;
  try {
    const result = await createPaymentLink(
      Math.round(Number(booking.deposit_amount) * 100),
      `AAD Detailing Deposit - ${booking.service}`,
      booking.id,
      `${body.origin}/booking-confirmation/${booking.id}`
    );
    paymentUrl = result.url;
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Failed to create Square payment link' },
      { status: 500 }
    );
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

  return NextResponse.json({ ok: true, paymentUrl });
}
