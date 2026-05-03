import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { computeAvailability, SlotTime } from '@/lib/slots';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/availability?from=YYYY-MM-DD&to=YYYY-MM-DD
 *
 * Returns availability for every date in the inclusive range.
 * No auth required - booking customers (anonymous-ish) need to see slots.
 * Counts ALL bookings on each day regardless of payment status, so a slot
 * held by a pending or unpaid booking still blocks new ones.
 */
export async function GET(req: NextRequest) {
  const fromStr = req.nextUrl.searchParams.get('from');
  const toStr = req.nextUrl.searchParams.get('to');

  if (!fromStr || !toStr) {
    return NextResponse.json({ error: 'from and to required (YYYY-MM-DD)' }, { status: 400 });
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fromStr) || !/^\d{4}-\d{2}-\d{2}$/.test(toStr)) {
    return NextResponse.json({ error: 'Invalid date format' }, { status: 400 });
  }

  // Pull bookings that fall in the range. Filter by slot_date so we ignore
  // legacy bookings that pre-date the slot system. A completed booking
  // (completed_at set OR status='completed') frees up the slot - the work
  // is done, capacity should be available again.
  const { data: bookings, error: bookingsErr } = await supabaseAdmin
    .from('bookings')
    .select('slot_date, slot_time, is_ceramic, status, deposit_paid, expires_at')
    .gte('slot_date', fromStr)
    .lte('slot_date', toStr)
    .not('slot_date', 'is', null)
    .not('slot_time', 'is', null)
    .neq('status', 'declined')
    .neq('status', 'completed')
    .is('completed_at', null);
    // NOTE: not filtering 'cancelled' here - it isn't in the booking_status
    // enum on this DB. Cancel route falls back to 'declined' status, which
    // is already excluded. Re-add this filter once the enum has 'cancelled'.

  if (bookingsErr) {
    return NextResponse.json({ error: bookingsErr.message }, { status: 500 });
  }

  // P0-1: real-time slot release. An approved-but-unpaid booking past its
  // expires_at no longer holds the slot, even if the cron hasn't flipped
  // it to 'declined' yet. Legacy rows without expires_at still occupy
  // the slot as before.
  const nowMs = Date.now();
  const liveBookings = (bookings ?? []).filter((b) => {
    if (b.status === 'approved' && !b.deposit_paid && b.expires_at) {
      if (new Date(b.expires_at).getTime() < nowMs) return false;
    }
    return true;
  });

  const { data: capacity, error: capErr } = await supabaseAdmin
    .from('daily_capacity')
    .select('day, is_help_available')
    .gte('day', fromStr)
    .lte('day', toStr);

  if (capErr) {
    return NextResponse.json({ error: capErr.message }, { status: 500 });
  }

  // P0-5: load default-help-available-by-DOW config. Used as the fallback
  // for days beyond the admin panel's 14-day window (or any other day
  // without an explicit daily_capacity row). Empty array preserves the
  // legacy "solo by default" behavior.
  const { data: cfgRow } = await supabaseAdmin
    .from('app_config')
    .select('value')
    .eq('key', 'default_help_available_dow')
    .maybeSingle();

  let defaultHelpDow: number[] = [];
  if (Array.isArray(cfgRow?.value)) {
    defaultHelpDow = (cfgRow.value as unknown[]).filter(
      (n): n is number => typeof n === 'number' && n >= 0 && n <= 6
    );
  }

  const helpByDay = new Map<string, boolean>();
  for (const row of capacity ?? []) {
    helpByDay.set(row.day, row.is_help_available);
  }

  const bookingsByDay = new Map<string, { slot_time: SlotTime; is_ceramic: boolean }[]>();
  for (const b of liveBookings) {
    if (!b.slot_date || !b.slot_time) continue;
    const list = bookingsByDay.get(b.slot_date) ?? [];
    list.push({ slot_time: b.slot_time as SlotTime, is_ceramic: b.is_ceramic });
    bookingsByDay.set(b.slot_date, list);
  }

  // Build the inclusive day range.
  const days: string[] = [];
  const start = new Date(fromStr + 'T00:00:00Z');
  const end = new Date(toStr + 'T00:00:00Z');
  for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
    days.push(d.toISOString().slice(0, 10));
  }

  const result = days.map((date) => {
    // Explicit row from daily_capacity wins. Otherwise fall back to the
    // day-of-week default from app_config. UTC midday avoids any DST/TZ
    // weirdness when computing the day-of-week for a YYYY-MM-DD string.
    const explicit = helpByDay.get(date);
    const dow = new Date(date + 'T12:00:00Z').getUTCDay();
    const helpAvailable =
      explicit !== undefined ? explicit : defaultHelpDow.includes(dow);
    return computeAvailability(date, helpAvailable, bookingsByDay.get(date) ?? []);
  });

  return NextResponse.json({ days: result });
}
