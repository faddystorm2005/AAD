import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { pushBookingToGoogle, findAdminUserId } from '@/lib/googleCalendar';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/paypal/check-capture?bookingId=<uuid>
 *
 * Webhook-free fallback: the customer-facing booking-confirmation page polls
 * this endpoint while waiting on payment. It looks up the PayPal order ID
 * from the saved payment_url (the `?token=XXX` query param), queries PayPal
 * directly, and if the order has been captured, flips deposit_paid + status
 * on the booking row.
 *
 * Public — no auth. Anyone with a booking UUID can trigger a check, which
 * is fine: it only ever advances the booking state forward (approved →
 * confirmed) based on PayPal's own confirmation. Worst case is wasted PayPal
 * API calls from random scraping.
 */

const PAYPAL_API_SANDBOX = 'https://api-m.sandbox.paypal.com';
const PAYPAL_API_PRODUCTION = 'https://api-m.paypal.com';

function paypalApiBase(): string {
  return process.env.PAYPAL_ENVIRONMENT === 'production'
    ? PAYPAL_API_PRODUCTION
    : PAYPAL_API_SANDBOX;
}

async function getAccessToken(): Promise<string | null> {
  const id = process.env.PAYPAL_CLIENT_ID;
  const secret = process.env.PAYPAL_CLIENT_SECRET;
  if (!id || !secret) return null;
  const res = await fetch(`${paypalApiBase()}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: 'Basic ' + Buffer.from(`${id}:${secret}`).toString('base64'),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });
  if (!res.ok) return null;
  const json = (await res.json()) as { access_token?: string };
  return json.access_token ?? null;
}

/**
 * Pull the PayPal order ID out of a saved payment_url. PayPal's approve link
 * looks like `https://www.sandbox.paypal.com/checkoutnow?token=8FG10923KF7134137`
 * — the token param IS the order ID.
 */
function extractOrderIdFromPayUrl(payUrl: string | null | undefined): string | null {
  if (!payUrl) return null;
  try {
    const url = new URL(payUrl);
    const token = url.searchParams.get('token');
    if (token) return token;
  } catch {
    /* fall through */
  }
  return null;
}

export async function GET(req: NextRequest) {
  const bookingId = req.nextUrl.searchParams.get('bookingId');
  if (!bookingId) {
    return NextResponse.json({ error: 'Missing bookingId' }, { status: 400 });
  }

  // Pull the booking and its payment_url.
  const { data: booking, error: bErr } = await supabaseAdmin
    .from('bookings')
    .select('id, status, deposit_paid, payment_url')
    .eq('id', bookingId)
    .maybeSingle();

  if (bErr || !booking) {
    return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
  }

  // If we've already flipped the status, nothing to do.
  if (booking.deposit_paid && booking.status === 'confirmed') {
    return NextResponse.json({ ok: true, status: 'already_confirmed' });
  }

  const orderId = extractOrderIdFromPayUrl(booking.payment_url);
  if (!orderId) {
    return NextResponse.json(
      { ok: false, status: 'no_paypal_order', reason: 'payment_url has no PayPal token' },
      { status: 200 }
    );
  }

  const accessToken = await getAccessToken();
  if (!accessToken) {
    return NextResponse.json(
      { ok: false, status: 'paypal_unavailable', reason: 'could not get OAuth token' },
      { status: 200 }
    );
  }

  // Look up the order on PayPal.
  const orderRes = await fetch(
    `${paypalApiBase()}/v2/checkout/orders/${orderId}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  if (!orderRes.ok) {
    const text = await orderRes.text().catch(() => '');
    console.error('[paypal check-capture] PayPal order lookup failed', orderRes.status, text.slice(0, 200));
    return NextResponse.json(
      { ok: false, status: 'paypal_lookup_failed', code: orderRes.status },
      { status: 200 }
    );
  }

  const order = (await orderRes.json()) as any;
  let orderStatus: string | undefined = order?.status;
  let captures: any[] = order?.purchase_units?.[0]?.payments?.captures ?? [];

  // PayPal v2 Orders flow: after the buyer approves, the order sits at
  // status=APPROVED until the merchant explicitly captures it. This is
  // required even when the order was created with intent=CAPTURE
  // (server-side flow doesn't auto-capture like Smart Buttons does).
  if (orderStatus === 'APPROVED') {
    const captureRes = await fetch(
      `${paypalApiBase()}/v2/checkout/orders/${orderId}/capture`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          // Idempotency: if the customer hits the page twice quickly we
          // don't want to double-capture. PayPal de-dupes on this header.
          'PayPal-Request-Id': `capture-${bookingId}`,
        },
        body: '{}',
      }
    );
    if (captureRes.ok) {
      const captured = (await captureRes.json()) as any;
      orderStatus = captured?.status;
      captures = captured?.purchase_units?.[0]?.payments?.captures ?? captures;
    } else {
      const text = await captureRes.text().catch(() => '');
      console.error('[paypal check-capture] capture call failed', captureRes.status, text.slice(0, 300));
      // 422 with ORDER_ALREADY_CAPTURED is fine — re-fetch to see captures.
      if (captureRes.status === 422) {
        const refetch = await fetch(
          `${paypalApiBase()}/v2/checkout/orders/${orderId}`,
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );
        if (refetch.ok) {
          const refreshed = (await refetch.json()) as any;
          orderStatus = refreshed?.status;
          captures = refreshed?.purchase_units?.[0]?.payments?.captures ?? captures;
        }
      } else {
        return NextResponse.json(
          { ok: false, status: 'capture_failed', code: captureRes.status },
          { status: 200 }
        );
      }
    }
  }

  const hasCompletedCapture = captures.some(
    (c) => (c?.status || '').toUpperCase() === 'COMPLETED'
  );

  if (orderStatus !== 'COMPLETED' && !hasCompletedCapture) {
    return NextResponse.json({
      ok: true,
      status: 'not_yet_captured',
      paypal_status: orderStatus,
    });
  }

  // Mark paid + confirmed. Same logic as the webhook handler.
  const { error: updateErr } = await supabaseAdmin
    .from('bookings')
    .update({ deposit_paid: true, status: 'confirmed' })
    .eq('id', bookingId)
    .in('status', ['approved', 'pending']);

  if (updateErr) {
    return NextResponse.json(
      { ok: false, status: 'db_update_failed', error: updateErr.message },
      { status: 500 }
    );
  }

  // Belt-and-suspenders: ensure deposit_paid even if status was already advanced.
  await supabaseAdmin
    .from('bookings')
    .update({ deposit_paid: true })
    .eq('id', bookingId)
    .eq('deposit_paid', false);

  // Sync to Google Calendar.
  const adminId = await findAdminUserId();
  if (adminId) {
    await pushBookingToGoogle(adminId, bookingId);
  }

  return NextResponse.json({ ok: true, status: 'confirmed_just_now' });
}
