import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { notifyCustomerBookingDeclined } from '@/lib/notify';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Expire approved-but-unpaid bookings (P0-1).
 *
 * A booking that is still 'approved' and deposit_paid=false past its
 * expires_at gets flipped to 'declined' so the bookkeeping stays clean
 * and the customer is notified. The slot itself was already freed in
 * real time by the availability route's expires_at filter, so this cron
 * is for record-keeping plus customer notification.
 *
 * Auth: Bearer token matching CRON_SECRET. Vercel cron sends this header
 * automatically when the path is registered in vercel.json.
 *
 * Schedule: configured in vercel.json. Daily is fine because the
 * availability route handles real-time slot release; this cron only
 * does cleanup + notifications.
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const expected = `Bearer ${process.env.CRON_SECRET}`;
  if (!process.env.CRON_SECRET || authHeader !== expected) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const nowIso = new Date().toISOString();

  // Find expired approved-but-unpaid bookings.
  const { data: expired, error: queryErr } = await supabaseAdmin
    .from('bookings')
    .select(
      `id, service, user_id, slot_date, slot_time,
       customer:profiles!user_id(full_name, phone, email)`
    )
    .eq('status', 'approved')
    .eq('deposit_paid', false)
    .not('expires_at', 'is', null)
    .lt('expires_at', nowIso);

  if (queryErr) {
    return NextResponse.json({ error: queryErr.message }, { status: 500 });
  }

  const ids = (expired ?? []).map((b) => b.id);
  if (ids.length === 0) {
    return NextResponse.json({ ok: true, expired: 0 });
  }

  // Flip them to 'declined' with a clear reason. Doing this in one batch
  // update keeps the cron fast even when several expire on the same run.
  const { error: updateErr } = await supabaseAdmin
    .from('bookings')
    .update({
      status: 'declined',
      decline_reason: 'Deposit not paid in time',
      declined_at: nowIso,
    })
    .in('id', ids);

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 });
  }

  // Best-effort customer notifications. We do these one at a time so a
  // single failed notification doesn't block the others.
  const failures: string[] = [];
  for (const b of expired ?? []) {
    try {
      const customer = (b as unknown as { customer?: {
        full_name: string | null;
        phone: string | null;
        email: string | null;
      } }).customer;
      await notifyCustomerBookingDeclined({
        customerName: customer?.full_name ?? null,
        customerPhone: customer?.phone ?? null,
        customerEmail: customer?.email ?? null,
        service: b.service,
        reason: 'Deposit was not paid in time. Please rebook to reserve a new slot.',
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      failures.push(`${b.id}: ${msg}`);
    }
  }

  return NextResponse.json({
    ok: true,
    expired: ids.length,
    notification_failures: failures.length > 0 ? failures : undefined,
  });
}
