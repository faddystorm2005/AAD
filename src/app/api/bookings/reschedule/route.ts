import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { computeAvailability, SLOT_TIMES, SlotTime } from '@/lib/slots';
import { phoenixOffsetFor, phoenixNowParts } from '@/lib/phoenixTime';
import { fetchDefaultHelpDow, resolveHelpAvailable } from '@/lib/defaultHelp';
import { pushBookingToGoogle, findAdminUserId } from '@/lib/googleCalendar';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/bookings/reschedule
 * Body: { bookingId, slotDate: YYYY-MM-DD, slotTime: HH:MM:SS }
 *
 * Move a booking to a new date+slot. Mirrors create-booking's authoritative
 * availability check. Customer can reschedule their own pending/approved/
 * confirmed bookings. Admin can also reschedule in_progress.
 *
 * Updates the Google Calendar event for the booking too (in place - same
 * google_event_id, just updated start/end).
 */

const CUSTOMER_RESCHEDULABLE = new Set(['pending', 'approved', 'confirmed']);
const ADMIN_RESCHEDULABLE = new Set([
  'pending',
  'approved',
  'confirmed',
  'in_progress',
]);

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
  const slotDate: string | undefined = body?.slotDate;
  const slotTime: string | undefined = body?.slotTime;

  if (
    !bookingId ||
    !slotDate ||
    !slotTime ||
    !/^\d{4}-\d{2}-\d{2}$/.test(slotDate) ||
    !SLOT_TIMES.includes(slotTime as SlotTime)
  ) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  const [{ data: booking }, { data: profile }] = await Promise.all([
    supabaseAdmin
      .from('bookings')
      .select('id, user_id, status, is_ceramic, slot_date, slot_time')
      .eq('id', bookingId)
      .maybeSingle(),
    supabaseAdmin.from('profiles').select('is_admin').eq('id', userId).maybeSingle(),
  ]);

  if (!booking) {
    return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
  }

  const isAdmin = Boolean(profile?.is_admin);
  const isOwner = booking.user_id === userId;
  if (!isAdmin && !isOwner) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const allowed = isAdmin ? ADMIN_RESCHEDULABLE : CUSTOMER_RESCHEDULABLE;
  if (!allowed.has(booking.status)) {
    return NextResponse.json(
      { error: `Cannot reschedule a booking in status "${booking.status}".` },
      { status: 409 }
    );
  }

  // No-op if they picked the same slot.
  if (booking.slot_date === slotDate && booking.slot_time === slotTime) {
    return NextResponse.json({ ok: true, status: 'unchanged' });
  }

  // Ceramic used to be locked to the 9 AM slot. With two detailers it moves
  // like any other booking, so there is no extra rule here any more.

  // Authoritative availability check on the new date. Mirror create-booking's
  // filter (excludes declined/completed/cancelled, requires completed_at IS NULL).
  // EXCLUDE the current booking from the count so moving same-day to a
  // different slot doesn't count itself as a conflict.
  const [{ data: dayBookings, error: bookingsErr }, { data: capRow, error: capErr }] =
    await Promise.all([
      supabaseAdmin
        .from('bookings')
        .select('id, slot_time, is_ceramic, status, deposit_paid, expires_at')
        .eq('slot_date', slotDate)
        .not('slot_time', 'is', null)
        .neq('status', 'declined')
        .neq('status', 'completed')
        .neq('id', bookingId)
        .is('completed_at', null),
        // 'cancelled' deliberately not filtered - see availability/route.ts.
      supabaseAdmin
        .from('daily_capacity')
        .select('is_help_available')
        .eq('day', slotDate)
        .maybeSingle(),
    ]);

  if (bookingsErr || capErr) {
    return NextResponse.json(
      { error: bookingsErr?.message || capErr?.message || 'Availability lookup failed' },
      { status: 500 }
    );
  }

  // Match the availability route's expires_at filter so a slot held by an
  // approved-but-unpaid booking past its 24h deadline doesn't block a
  // reschedule into it.
  const nowMs = Date.now();
  type DayBooking = { slot_time: SlotTime | null; is_ceramic: boolean; status: string; deposit_paid?: boolean | null; expires_at?: string | null };
  const liveBookings = ((dayBookings ?? []) as DayBooking[]).filter((b) => {
    if (b.status === 'approved' && !b.deposit_paid && b.expires_at) {
      if (new Date(b.expires_at).getTime() < nowMs) return false;
    }
    return true;
  });

  // Same rule the booking page uses: an explicit daily_capacity row wins,
  // otherwise the day-of-week default from app_config. This used to hardcode
  // false, so a customer could be told a slot was full on the reschedule
  // screen while the booking page showed it as open.
  const isHelpAvailable = resolveHelpAvailable(
    slotDate,
    capRow?.is_help_available ?? undefined,
    await fetchDefaultHelpDow()
  );
  const availability = computeAvailability(
    slotDate,
    isHelpAvailable,
    liveBookings.map((b) => ({
      slot_time: b.slot_time as SlotTime,
      is_ceramic: b.is_ceramic,
    })),
    phoenixNowParts()
  );

  const slot = availability.slots.find((s) => s.time === slotTime);
  if (!slot) {
    return NextResponse.json({ error: 'Invalid slot' }, { status: 400 });
  }
  const slotOk = booking.is_ceramic ? slot.availableForCeramic : slot.availableForRegular;
  if (!slotOk) {
    const message = slot.pastSlot
      ? "That time has already passed. Please pick a later slot or a different day."
      : 'That slot is full. Please pick another time.';
    return NextResponse.json({ error: message }, { status: 409 });
  }

  const scheduledAt = `${slotDate}T${slotTime}${phoenixOffsetFor(slotDate)}`;

  const { error: updateErr } = await supabaseAdmin
    .from('bookings')
    .update({
      slot_date: slotDate,
      slot_time: slotTime,
      scheduled_at: scheduledAt,
    })
    .eq('id', bookingId);

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 });
  }

  // Push the updated booking to Google Calendar. Best-effort.
  try {
    const adminId = await findAdminUserId();
    if (adminId) await pushBookingToGoogle(adminId, bookingId);
  } catch (err) {
    console.error('[reschedule] Google sync failed', err);
  }

  return NextResponse.json({ ok: true, status: 'rescheduled' });
}
