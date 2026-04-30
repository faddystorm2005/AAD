import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  calculatePricing,
  SERVICES,
  BookingData,
  isCeramicSelected,
} from '@/lib/bookingPricing';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { computeAvailability, SLOT_TIMES, SlotTime, CERAMIC_SLOT } from '@/lib/slots';
import { austinOffsetFor } from '@/lib/austinTime';
import { notifyAdminNewBooking } from '@/lib/notify';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface CreateBookingPayload extends BookingData {
  origin: string;
  slotDate: string; // YYYY-MM-DD
  slotTime: SlotTime;
  promoCode?: string | null;
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
  const userId = userData.user.id;

  const body = (await req.json().catch(() => null)) as CreateBookingPayload | null;
  if (!body) {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (
    !body.vehicleId ||
    !body.serviceSize ||
    !SERVICES[body.serviceSize] ||
    !body.address ||
    !body.city ||
    !body.zip ||
    !body.origin ||
    !body.slotDate ||
    !body.slotTime ||
    !/^\d{4}-\d{2}-\d{2}$/.test(body.slotDate) ||
    !SLOT_TIMES.includes(body.slotTime)
  ) {
    return NextResponse.json({ error: 'Missing or invalid booking fields' }, { status: 400 });
  }

  const isCeramic = isCeramicSelected(body.selectedAddOns);

  // Ceramic-only-at-5pm hard rule.
  if (isCeramic && body.slotTime !== CERAMIC_SLOT) {
    return NextResponse.json(
      { error: 'Ceramic Coating is mornings only - please pick the first slot of the day (9:00 AM).' },
      { status: 400 }
    );
  }

  // Server-authoritative availability check. Pull existing bookings + capacity
  // for the requested date and recompute whether this slot is bookable.
  const [{ data: dayBookings, error: bookingsErr }, { data: capRow, error: capErr }] =
    await Promise.all([
      supabaseAdmin
        .from('bookings')
        .select('slot_time, is_ceramic, status')
        .eq('slot_date', body.slotDate)
        .not('slot_time', 'is', null)
        // Match /api/availability's filter: completed bookings free the slot,
        // declined bookings never held it. Without these matching, the form
        // shows a slot as open but submit fails with "slot just filled up".
        .neq('status', 'declined')
        .neq('status', 'completed')
        .is('completed_at', null),
        // 'cancelled' deliberately not filtered - see availability/route.ts.
      supabaseAdmin
        .from('daily_capacity')
        .select('is_help_available')
        .eq('day', body.slotDate)
        .maybeSingle(),
    ]);

  if (bookingsErr || capErr) {
    return NextResponse.json(
      { error: bookingsErr?.message || capErr?.message || 'Availability lookup failed' },
      { status: 500 }
    );
  }

  const isHelpAvailable = capRow?.is_help_available ?? false;
  const availability = computeAvailability(
    body.slotDate,
    isHelpAvailable,
    (dayBookings ?? []).map((b) => ({
      slot_time: b.slot_time as SlotTime,
      is_ceramic: b.is_ceramic,
    }))
  );

  const slot = availability.slots.find((s) => s.time === body.slotTime);
  if (!slot) {
    return NextResponse.json({ error: 'Invalid slot' }, { status: 400 });
  }
  const slotOk = isCeramic ? slot.availableForCeramic : slot.availableForRegular;
  if (!slotOk) {
    return NextResponse.json(
      { error: 'That slot just filled up. Please pick another.' },
      { status: 409 }
    );
  }

  // Determine returning-customer status.
  const { count, error: countError } = await userClient
    .from('bookings')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('deposit_paid', true);

  if (countError) {
    return NextResponse.json(
      { error: `Failed to determine returning status: ${countError.message}` },
      { status: 500 }
    );
  }
  const isReturning = (count ?? 0) > 0;

  // Per-customer custom discount (set by an admin in the Manage Users panel).
  // Best-effort - if the columns don't exist yet we just skip it.
  let customDiscountRate = 0;
  let discountSingleUse = false;
  try {
    const { data: profile } = await userClient
      .from('profiles')
      .select('custom_discount_rate, discount_single_use')
      .eq('id', userId)
      .maybeSingle();
    customDiscountRate = Number(profile?.custom_discount_rate) || 0;
    discountSingleUse = Boolean(profile?.discount_single_use);
  } catch {
    customDiscountRate = 0;
    discountSingleUse = false;
  }

  // Promo code (optional). Re-validate server-side to avoid race conditions
  // where the code was used up between the form's preview and submission.
  let promoDiscountRate = 0;
  let promoCodeId: string | null = null;
  let promoCodeUsed: string | null = null;
  const promoCodeRaw: string | null | undefined = body.promoCode;
  if (promoCodeRaw && promoCodeRaw.trim()) {
    const code = promoCodeRaw.trim().toUpperCase();
    try {
      const { data: promo } = await supabaseAdmin
        .from('promo_codes')
        .select('id, code, discount_rate, max_uses, uses_count, expires_at, active')
        .eq('code', code)
        .maybeSingle();
      const valid =
        promo &&
        promo.active &&
        (!promo.expires_at || new Date(promo.expires_at) >= new Date()) &&
        (promo.max_uses == null || promo.uses_count < promo.max_uses);
      if (valid) {
        promoDiscountRate = Number(promo.discount_rate) || 0;
        promoCodeId = promo.id;
        promoCodeUsed = promo.code;
      }
    } catch {
      // promo_codes table doesn't exist yet - silently skip.
    }
  }

  const pricing = calculatePricing(
    {
      vehicleId: body.vehicleId,
      serviceSize: body.serviceSize,
      selectedAddOns: body.selectedAddOns ?? [],
      scheduledAt: body.scheduledAt ?? '',
      address: body.address,
      city: body.city,
      state: body.state,
      zip: body.zip,
    },
    { isReturning, customDiscountRate, promoDiscountRate }
  );

  // Combine slot date + time into a TIMESTAMPTZ for `scheduled_at`. Austin
  // observes DST, so we look up the right offset (-05:00 CDT or -06:00 CST)
  // for the slot's calendar date.
  const scheduledAt = `${body.slotDate}T${body.slotTime}${austinOffsetFor(body.slotDate)}`;

  const { data: booking, error: insertError } = await userClient
    .from('bookings')
    .insert({
      user_id: userId,
      vehicle_id: body.vehicleId,
      size: body.serviceSize,
      service: SERVICES[body.serviceSize].name,
      addons: body.selectedAddOns ?? [],
      scheduled_at: scheduledAt,
      slot_date: body.slotDate,
      slot_time: body.slotTime,
      is_ceramic: isCeramic,
      address: body.address,
      city: body.city,
      state: body.state,
      zip: body.zip,
      deposit_amount: pricing.deposit,
      deposit_paid: false,
      discount_applied: pricing.discount > 0,
      discount_amount: pricing.discount,
      subtotal: pricing.subtotal,
      total: pricing.total,
      booking_stage: 'requested',
      status: 'pending',
    })
    .select()
    .single();

  if (insertError || !booking) {
    return NextResponse.json(
      { error: insertError?.message || 'Failed to save booking' },
      { status: 500 }
    );
  }

  // Single-use discount: clear it immediately so the customer's NEXT
  // booking goes back to normal pricing. If the update fails we log it
  // but don't fail the booking - worst case the customer keeps the
  // discount one extra time, admin can correct in the Manage Users panel.
  if (discountSingleUse && customDiscountRate > 0) {
    const { error: clearErr } = await userClient
      .from('profiles')
      .update({ custom_discount_rate: 0, discount_single_use: false })
      .eq('id', userId);
    if (clearErr) {
      console.error('[create-booking] single-use discount clear failed', {
        userId,
        bookingId: booking.id,
        error: clearErr.message,
      });
    }
  }

  // Promo code accounting: increment uses_count and stamp the code on the
  // booking row for record-keeping. Best-effort.
  if (promoCodeId) {
    try {
      await supabaseAdmin.rpc('increment_promo_uses', { p_id: promoCodeId });
    } catch {
      // RPC missing - fall back to a read+write (small race risk but OK).
      const { data: cur } = await supabaseAdmin
        .from('promo_codes')
        .select('uses_count')
        .eq('id', promoCodeId)
        .maybeSingle();
      const newCount = (cur?.uses_count ?? 0) + 1;
      await supabaseAdmin
        .from('promo_codes')
        .update({ uses_count: newCount })
        .eq('id', promoCodeId);
    }
    if (promoCodeUsed) {
      await supabaseAdmin
        .from('bookings')
        .update({ promo_code_used: promoCodeUsed })
        .eq('id', booking.id);
    }
  }

  // Fire-and-forget: SMS the admin so they know to approve. Doesn't block
  // the response - even if Twilio is unreachable the customer's booking
  // still saves and they see the confirmation page.
  try {
    const { data: customer } = await supabaseAdmin
      .from('profiles')
      .select('full_name, phone')
      .eq('id', userId)
      .maybeSingle();

    await notifyAdminNewBooking({
      bookingId: booking.id,
      customerName: customer?.full_name ?? null,
      customerPhone: customer?.phone ?? null,
      service: SERVICES[body.serviceSize].name,
      scheduledAt,
      address: `${body.address}, ${body.city}, ${body.state} ${body.zip}`,
    });
  } catch (err) {
    console.error('[notify] admin booking SMS failed', err);
  }

  // No Square call here. The customer is now in 'pending' awaiting admin
  // approval. The deposit payment link is created when admin approves.
  return NextResponse.json({
    bookingId: booking.id,
    pricing,
    status: 'pending',
  });
}
