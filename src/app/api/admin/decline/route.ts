import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { deleteBookingFromGoogle } from '@/lib/googleCalendar';
import { notifyCustomerBookingDeclined } from '@/lib/notify';
import { sendPushToCustomer } from '@/lib/pushNotifications';
import { oneOf, type JoinedCustomer } from '@/lib/bookingJoins';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface DeclineBody {
  bookingId: string;
  reason?: string;
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

  const body = (await req.json().catch(() => null)) as DeclineBody | null;
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
  if (booking.status === 'declined') {
    return NextResponse.json({ ok: true });
  }
  if (booking.status === 'completed' || booking.status === 'in_progress') {
    return NextResponse.json(
      { error: `Cannot decline a booking in status "${booking.status}"` },
      { status: 409 }
    );
  }

  const reason = (body.reason ?? '').trim();
  const { error: updateErr } = await supabaseAdmin
    .from('bookings')
    .update({
      status: 'declined',
      decline_reason: reason || null,
      declined_at: new Date().toISOString(),
    })
    .eq('id', body.bookingId);

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 });
  }

  // Remove from Google Calendar (best-effort).
  await deleteBookingFromGoogle(userData.user.id, body.bookingId);

  // Push notification to customer (best-effort).
  try {
    await sendPushToCustomer(body.bookingId, {
      title: 'Booking update',
      body: 'Your booking could not be accommodated. Tap to view details.',
      url: `/booking-confirmation/${body.bookingId}`,
      tag: `booking-declined-${body.bookingId}`,
    });
  } catch (err) {
    console.error('[push] customer decline notification failed', err);
  }

  // SMS + email so customers without push still get notified (best-effort).
  try {
    const customer = oneOf<JoinedCustomer>(booking.customer);
    await notifyCustomerBookingDeclined({
      customerName: customer?.full_name ?? null,
      customerPhone: customer?.phone ?? null,
      customerEmail: customer?.email ?? null,
      service: booking.service,
      reason: reason || null,
    });
  } catch (err) {
    console.error('[notify] customer decline sms/email failed', err);
  }

  return NextResponse.json({ ok: true });
}
