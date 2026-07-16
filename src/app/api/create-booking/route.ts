import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  calculatePricing,
  SERVICES,
  BookingData,
  isCeramicSelected,
  SERVICE_TYPES,
  ServiceType,
  SERVICE_TYPE_DEFAULT,
  SERVICE_TYPE_NAMES,
} from '@/lib/bookingPricing';
import { fetchLivePriceTable } from '@/lib/livePricing';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { computeAvailability, SLOT_TIMES, SlotTime, CERAMIC_SLOT } from '@/lib/slots';
import { austinOffsetFor, austinNowParts } from '@/lib/austinTime';
import { notifyAdminNewBooking } from '@/lib/notify';
import { sendPushToAllAdmins } from '@/lib/pushNotifications';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface CreateBookingPayload extends BookingData {
  origin: string;
  slotDate: string; // YYYY-MM-DD
  slotTime: SlotTime;
  promoCode?: string | null;
  notes?: string | null;
  unit?: string | null;
  serviceType?: ServiceType;
  photoPermission?: boolean;
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
    (body.serviceType !== undefined && !SERVICE_TYPES.includes(body.serviceType)) ||
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

  // Default service type for callers that do not supply one yet
  // (e.g., the existing BookingForm before Phase 3 ships).
  const serviceType: ServiceType = body.serviceType ?? SERVICE_TYPE_DEFAULT;

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
        .select('slot_time, is_ceramic, status, deposit_paid, expires_at')
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

  // Match the availability route's expires_at filter so a slot held by an
  // approved-but-unpaid booking past its 24h deadline doesn't reject a
  // legitimate booking. Without this, customers see the slot as Open in
  // the form but submit fails with "slot just filled up".
  const nowMs = Date.now();
  type DayBooking = { slot_time: SlotTime | null; is_ceramic: boolean; status: string; deposit_paid?: boolean | null; expires_at?: string | null };
  const liveBookings = ((dayBookings ?? []) as DayBooking[]).filter((b) => {
    if (b.status === 'approved' && !b.deposit_paid && b.expires_at) {
      if (new Date(b.expires_at).getTime() < nowMs) return false;
    }
    return true;
  });

  const isHelpAvailable = capRow?.is_help_available ?? false;
  const availability = computeAvailability(
    body.slotDate,
    isHelpAvailable,
    liveBookings.map((b) => ({
      slot_time: b.slot_time as SlotTime,
      is_ceramic: b.is_ceramic,
    })),
    austinNowParts()
  );

  const slot = availability.slots.find((s) => s.time === body.slotTime);
  if (!slot) {
    return NextResponse.json({ error: 'Invalid slot' }, { status: 400 });
  }
  const slotOk = isCeramic ? slot.availableForCeramic : slot.availableForRegular;
  if (!slotOk) {
    // Distinguish past-slot from "just filled up" so the message is honest.
    // A 9 PM customer trying to grab the 1 PM slot didn't get sniped; the
    // slot has already started.
    const message = slot.pastSlot
      ? "That time has already passed. Please pick a later slot or a different day."
      : 'That slot just filled up. Please pick another.';
    return NextResponse.json({ error: message }, { status: 409 });
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

  // Promo code (optional). Try the atomic claim_promo_use RPC first; fall back
  // to a direct query if the RPC isn't deployed yet so discounts still work.
  let promoDiscountRate = 0;
  let promoCodeUsed: string | null = null;
  let promoCodeId: string | null = null;
  const promoCodeRaw: string | null | undefined = body.promoCode;
  if (promoCodeRaw && promoCodeRaw.trim()) {
    const code = promoCodeRaw.trim().toUpperCase();
    let claimed = false;
    try {
      const { data: claimData } = await supabaseAdmin
        .rpc('claim_promo_use', { p_code: code });
      const row = Array.isArray(claimData) && claimData.length > 0 ? claimData[0] : null;
      if (row) {
        promoDiscountRate = Number(row.discount_rate) || 0;
        promoCodeUsed = row.promo_code as string;
        promoCodeId = row.promo_id as string;
        claimed = true;
      }
    } catch {
      // RPC not deployed - fall back to direct query below.
    }

    if (!claimed) {
      const { data: promoRow } = await supabaseAdmin
        .from('promo_codes')
        .select('id, code, discount_rate, max_uses, uses_count, expires_at, active')
        .eq('code', code)
        .maybeSingle();
      if (
        promoRow &&
        promoRow.active &&
        (!promoRow.expires_at || new Date(promoRow.expires_at) >= new Date()) &&
        (promoRow.max_uses == null || promoRow.uses_count < promoRow.max_uses)
      ) {
        promoDiscountRate = Number(promoRow.discount_rate) || 0;
        promoCodeUsed = promoRow.code as string;
        promoCodeId = promoRow.id as string;
        // Increment usage count (non-atomic fallback - acceptable until RPC is deployed).
        await supabaseAdmin
          .from('promo_codes')
          .update({ uses_count: promoRow.uses_count + 1 })
          .eq('id', promoRow.id);
      }
    }
  }

  // Customer-supplied special instructions. Trim, cap length, treat empty
  // as null so the DB column stays clean.
  const safeNotes =
    typeof body.notes === 'string' && body.notes.trim().length > 0
      ? body.notes.trim().slice(0, 500)
      : null;

  // Live portal-managed prices, fetched fresh because money changes hands
  // here. Falls back to the baked-in constants on any problem, which is
  // exactly what the booking form showed in that case too.
  const livePriceTable = await fetchLivePriceTable({ fresh: true });

  const pricing = calculatePricing(
    {
      vehicleId: body.vehicleId,
      serviceSize: body.serviceSize,
      serviceType: serviceType,
      selectedAddOns: body.selectedAddOns ?? [],
      scheduledAt: body.scheduledAt ?? '',
      address: body.address,
      city: body.city,
      state: body.state,
      zip: body.zip,
    },
    { isReturning, customDiscountRate, promoDiscountRate, live: livePriceTable }
  );

  // Apply account credit toward the total (if any). debit_credit_max acquires
  // a FOR UPDATE row lock so two concurrent bookings cannot both spend the
  // same dollars (P0-3 fix). The debit happens before the insert so the
  // booking row records the correct credit_applied and total values. If the
  // insert fails we issue a refund via issue_credit.
  let creditApplied = 0;
  try {
    const { data: debited } = await supabaseAdmin
      .rpc('debit_credit_max', { p_user_id: userId, p_max_amount: pricing.total });
    creditApplied = Math.max(0, Number(debited ?? 0));
  } catch {
    // RPC not deployed yet - fall back to zero credit. Migration not run.
    creditApplied = 0;
  }
  const totalAfterCredit = Math.max(0, pricing.total - creditApplied);

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
      service: SERVICE_TYPE_NAMES[serviceType],
      service_type: serviceType,
      addons: body.selectedAddOns ?? [],
      scheduled_at: scheduledAt,
      slot_date: body.slotDate,
      slot_time: body.slotTime,
      is_ceramic: isCeramic,
      address: body.address,
      unit: body.unit?.trim() || null,
      city: body.city,
      state: body.state,
      zip: body.zip,
      deposit_amount: pricing.deposit,
      deposit_paid: false,
      discount_applied: pricing.discount > 0,
      discount_amount: pricing.discount,
      subtotal: pricing.subtotal,
      total: totalAfterCredit,
      credit_applied: creditApplied,
      booking_stage: 'requested',
      status: 'pending',
      notes: safeNotes,
      photo_permission: body.photoPermission === true,
    })
    .select()
    .single();

  if (insertError || !booking) {
    // Booking insert failed - undo any side-effects that already ran.
    // Refund credit debited before the insert.
    if (creditApplied > 0) {
      try {
        await supabaseAdmin.rpc('issue_credit', { p_user_id: userId, p_amount: creditApplied });
      } catch (err) {
        console.error('[create-booking] credit refund after insert failure', { userId, creditApplied, err });
      }
    }
    // Release the promo use we already claimed.
    if (promoCodeId) {
      try {
        await supabaseAdmin.rpc('release_promo_use', { p_promo_id: promoCodeId });
      } catch (err) {
        console.error('[create-booking] promo release after insert failure', { promoCodeId, err });
      }
    }
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

  // Stamp the promo code on the booking row for record-keeping. The use was
  // already claimed atomically by use_promo_code before the insert.
  if (promoCodeUsed) {
    await supabaseAdmin
      .from('bookings')
      .update({ promo_code_used: promoCodeUsed })
      .eq('id', booking.id);
  }

  // Fire-and-forget: notify admin via SMS + push. Doesn't block the response.
  try {
    const { data: customer } = await supabaseAdmin
      .from('profiles')
      .select('full_name, phone')
      .eq('id', userId)
      .maybeSingle();

    const customerName = customer?.full_name ?? null;

    await notifyAdminNewBooking({
      bookingId: booking.id,
      customerName,
      customerPhone: customer?.phone ?? null,
      service: SERVICE_TYPE_NAMES[serviceType],
      scheduledAt,
      address: `${body.address}, ${body.city}, ${body.state} ${body.zip}`,
    });

    await sendPushToAllAdmins({
      title: 'New booking request',
      body: `${customerName ?? 'A customer'} booked ${SERVICE_TYPE_NAMES[serviceType]} for ${body.slotDate} at ${body.slotTime}`,
      url: `/booking-confirmation/${booking.id}`,
      tag: `booking-new-${booking.id}`,
    });
  } catch (err) {
    console.error('[notify] admin notification failed', err);
  }

  // No Square call here. The customer is now in 'pending' awaiting admin
  // approval. The deposit payment link is created when admin approves.
  return NextResponse.json({
    bookingId: booking.id,
    pricing,
    status: 'pending',
  });
}
