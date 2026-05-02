import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { pushBookingToGoogle } from '@/lib/googleCalendar';
import { notifyCustomerCarReady } from '@/lib/notify';
import { sendPushToCustomer, sendPushToAllAdmins } from '@/lib/pushNotifications';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { ALL_STAGES, STAGE_LABELS } from '@/lib/bookingStages';
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

  // Per-stage customer push messages.
  const CUSTOMER_STAGE_PUSH: Partial<Record<string, { title: string; body: string }>> = {
    exterior: {
      title: 'Exterior detail started',
      body: 'Austin Auto Detail is working on your car\'s exterior right now.',
    },
    paint_correction: {
      title: 'Paint correction underway',
      body: 'Paint correction is in progress on your car.',
    },
    interior: {
      title: 'Interior detail started',
      body: 'Now working on your car\'s interior — almost done!',
    },
    coatings: {
      title: 'Protective coating being applied',
      body: 'Final protective coating is going on your car.',
    },
    done: {
      title: 'Your car is ready!',
      body: 'Your detail is complete. Come see the results!',
    },
  };

  // When marked DONE, send SMS + email via notifyCustomerCarReady. Best-effort.
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
      }
    } catch (err) {
      console.error('[notify] car-ready notification failed', err);
    }
  }

  // Push to customer for every stage except 'requested'. Best-effort.
  const customerMsg = CUSTOMER_STAGE_PUSH[stage];
  if (customerMsg) {
    try {
      await sendPushToCustomer(bookingId, {
        ...customerMsg,
        url: `/booking-confirmation/${bookingId}`,
        tag: `booking-stage-${stage}-${bookingId}`,
      });
    } catch (err) {
      console.error('[push] customer stage notification failed', err);
    }
  }

  // Push to all admins so the whole team sees every stage update. Best-effort.
  try {
    await sendPushToAllAdmins({
      title: `Stage: ${STAGE_LABELS[stage as Stage] || stage}`,
      body: `Booking ${bookingId.slice(0, 8)} moved to ${STAGE_LABELS[stage as Stage] || stage}.`,
      url: `/admin`,
      tag: `admin-stage-${stage}-${bookingId}`,
    });
  } catch (err) {
    console.error('[push] admin stage notification failed', err);
  }

  return NextResponse.json({ ok: true });
}
