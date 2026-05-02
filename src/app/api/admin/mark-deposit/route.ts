import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { pushBookingToGoogle } from '@/lib/googleCalendar';
import { sendPushToCustomer } from '@/lib/pushNotifications';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

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

  const body = await req.json().catch(() => null);
  const bookingId: string | undefined = body?.bookingId;
  const paid: boolean = body?.paid !== false;

  if (!bookingId) {
    return NextResponse.json({ error: 'Missing bookingId' }, { status: 400 });
  }

  // Read current status so we can keep status + deposit_paid consistent.
  const { data: current, error: readErr } = await supabaseAdmin
    .from('bookings')
    .select('status')
    .eq('id', bookingId)
    .single();

  if (readErr || !current) {
    return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
  }

  const update: Record<string, unknown> = { deposit_paid: paid };

  if (paid) {
    // Mark paid: if booking was 'approved' or 'pending', advance to 'confirmed'
    // (mirrors the Square webhook). Don't clobber later states like 'in_progress'.
    if (current.status === 'approved' || current.status === 'pending') {
      update.status = 'confirmed';
    }
  } else {
    // Mark unpaid: if booking was 'confirmed', revert to 'approved' so the
    // customer sees the pay-deposit link again. Don't touch later states.
    if (current.status === 'confirmed') {
      update.status = 'approved';
    }
  }

  const { error } = await supabaseAdmin
    .from('bookings')
    .update(update)
    .eq('id', bookingId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Sync to Google Calendar (best-effort).
  await pushBookingToGoogle(userData.user.id, bookingId);

  // Notify customer when deposit is confirmed (best-effort).
  if (paid && (current.status === 'approved' || current.status === 'pending')) {
    try {
      await sendPushToCustomer(bookingId, {
        title: 'Deposit received - you\'re confirmed!',
        body: 'Your deposit was received. Your detailing appointment is locked in.',
        url: `/booking-confirmation/${bookingId}`,
        tag: `booking-confirmed-${bookingId}`,
      });
    } catch (err) {
      console.error('[push] deposit confirmed notification failed', err);
    }
  }

  return NextResponse.json({ ok: true });
}
