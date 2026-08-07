import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { isPaymentMethod } from '@/lib/payments';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/mark-paid
 * Body: { bookingId, paid: true, amount: number, method: PaymentMethod }
 *       { bookingId, paid: false }                       // undo
 *
 * Records the payment Alex actually collected on-site.
 *
 * This route deliberately touches ONLY paid_at / paid_amount /
 * payment_method. It never writes `deposit_paid` or `status`:
 *
 *   * `deposit_paid` is load-bearing for scheduling. /api/admin/approve
 *     sets it true so an approved booking keeps its slot, and both
 *     /api/availability and the expire-approvals cron read it. Writing it
 *     here is what made the old mark-deposit toggle useless and risky.
 *   * `status` tracks the job, not the money. Payment now happens after
 *     the detail is finished, so being paid says nothing about which
 *     stage the booking is in. Alex advances the stage separately.
 *
 * Admin-only. Requires a Bearer access token belonging to an is_admin
 * profile, matching every other route under /api/admin.
 */

// Matches the numeric(10,2) column: at most 8 digits before the decimal.
const MAX_AMOUNT = 99_999_999.99;

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

  let update: Record<string, unknown>;

  if (paid) {
    // Accept a number or a numeric string, so "275" and "275.00" both work.
    const rawAmount = body?.amount;
    const amount =
      typeof rawAmount === 'number' ? rawAmount : Number(String(rawAmount ?? '').trim());

    if (!Number.isFinite(amount)) {
      return NextResponse.json(
        { error: 'Enter the amount you collected.' },
        { status: 400 }
      );
    }
    if (amount < 0) {
      return NextResponse.json(
        { error: 'Amount cannot be negative.' },
        { status: 400 }
      );
    }
    if (amount > MAX_AMOUNT) {
      return NextResponse.json(
        { error: 'That amount looks too large. Check for a typo.' },
        { status: 400 }
      );
    }

    const method = body?.method;
    if (!isPaymentMethod(method)) {
      return NextResponse.json(
        { error: 'Pick how the customer paid.' },
        { status: 400 }
      );
    }

    update = {
      paid_at: new Date().toISOString(),
      // Round to cents so floating point noise never reaches numeric(10,2).
      paid_amount: Math.round(amount * 100) / 100,
      payment_method: method,
    };
  } else {
    // Undo. Clear all three together to satisfy the all-or-nothing
    // constraint in supabase-add-payment-tracking.sql.
    update = { paid_at: null, paid_amount: null, payment_method: null };
  }

  const { data, error } = await supabaseAdmin
    .from('bookings')
    .update(update)
    .eq('id', bookingId)
    .select('id, paid_at, paid_amount, payment_method')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
  }

  return NextResponse.json({ ok: true, booking: data });
}
