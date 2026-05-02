import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { pushBookingToGoogle } from '@/lib/googleCalendar';
import { notifyCustomerCarReady } from '@/lib/notify';
import { sendPushToCustomer } from '@/lib/pushNotifications';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { ALL_STAGES } from '@/lib/bookingStages';
const ALLOWED_STAGES = ALL_STAGES;
type Stage = (typeof ALLOWED_STAGES)[number];

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
  const stage: string | undefined = body?.stage;

  if (!bookingId || !stage || !ALLOWED_STAGES.includes(stage as Stage)) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  const { data: current, error: readError } = await supabaseAdmin
    .from('bookings')
    .select('started_at, completed_at')
    .eq('id', bookingId)
    .single();

  if (readError || !current) {
    return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
  }

  const now = new Date().toISOString();
  const update: Record<string, unknown> = { booking_stage: stage };

  // First time the booking advances past 'requested', stamp started_at.
  if (stage !== 'requested' && !current.started_at) {
    update.started_at = now;
  }

  // When hitting 'done' for the first time, stamp completed_at and flip the
  // top-level status so the slot frees up in availability and the admin
  // "active" filter stops showing it.
  if (stage === 'done' && !current.completed_at) {
    update.completed_at = now;
    update.status = 'completed';
  }

  const { error: updateError } = await supabaseAdmin
    .from('bookings')
    .update(update)
    .eq('id', bookingId);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  // Sync the updated booking to Google Calendar (best-effort).
  await pushBookingToGoogle(userData.user.id, bookingId);

  // When marked DONE, notify the customer (SMS + email + push). Best-effort.
  if (stage === 'done') {
    try {
      const { data: b } = await supabaseAdmin
        .from('bookings')
        .select(
          `service, user_id,
           customer:profiles!user_id(full_name, phone, email)`
        )
        .eq('id', bookingId)
        .maybeSingle();

      if (b) {
        const customer = (b as any).customer;
        await notifyCustomerCarReady({
          customerName: customer?.full_name ?? null,
          customerPhone: customer?.phone ?? null,
          customerEmail: customer?.email ?? null,
          service: (b as any).service,
          bookingId,
        });
        await sendPushToCustomer(bookingId, {
          title: 'Your car is ready',
          body: `Your ${(b as any).service} is complete. Thanks for choosing Austin Auto Detail!`,
          url: `/booking-confirmation/${bookingId}`,
          tag: `booking-done-${bookingId}`,
        });
      }
    } catch (err) {
      console.error('[notify] car-ready notification failed', err);
    }
  }

  // When service starts (first advance past 'requested'), push a heads-up. Best-effort.
  if (stage !== 'requested' && !current.started_at) {
    try {
      await sendPushToCustomer(bookingId, {
        title: 'Service in progress',
        body: 'Austin Auto Detail has started working on your car.',
        url: `/booking-confirmation/${bookingId}`,
        tag: `booking-inprogress-${bookingId}`,
      });
    } catch (err) {
      console.error('[push] in-progress notification failed', err);
    }
  }

  return NextResponse.json({ ok: true });
}
