import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { pushBookingToGoogle, findAdminUserId } from '@/lib/googleCalendar';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * PayPal webhook handler — mirrors the Square handler.
 *
 * The new @paypal/paypal-server-sdk does NOT include a webhook helper, so
 * we verify by calling PayPal's /v1/notifications/verify-webhook-signature
 * endpoint with the headers PayPal sends.
 *
 * Required env vars:
 *   PAYPAL_CLIENT_ID
 *   PAYPAL_CLIENT_SECRET
 *   PAYPAL_ENVIRONMENT      (sandbox | production, default sandbox)
 *   PAYPAL_WEBHOOK_ID       (set after creating the webhook in PayPal Dashboard)
 *
 * Subscribed events (configure in PayPal Developer Dashboard):
 *   PAYMENT.CAPTURE.COMPLETED   ← we flip status=confirmed on this
 *   PAYMENT.CAPTURE.DENIED      ← optional, for visibility (we just log)
 */

const PAYPAL_API_SANDBOX = 'https://api-m.sandbox.paypal.com';
const PAYPAL_API_PRODUCTION = 'https://api-m.paypal.com';

function paypalApiBase(): string {
  return process.env.PAYPAL_ENVIRONMENT === 'production'
    ? PAYPAL_API_PRODUCTION
    : PAYPAL_API_SANDBOX;
}

/**
 * Get a fresh OAuth access token for calling PayPal's verify endpoint.
 * (We can't reuse the SDK's token since the verify endpoint is a different
 * API than Orders — but the credentials are the same.)
 */
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

interface VerifyWebhookBody {
  auth_algo: string;
  cert_url: string;
  transmission_id: string;
  transmission_sig: string;
  transmission_time: string;
  webhook_id: string;
  webhook_event: unknown;
}

async function verifyWebhook(req: NextRequest, rawBody: string): Promise<boolean> {
  const webhookId = process.env.PAYPAL_WEBHOOK_ID;
  if (!webhookId) return false;

  const accessToken = await getAccessToken();
  if (!accessToken) return false;

  const headerOr = (name: string) => req.headers.get(name) ?? '';
  const verifyBody: VerifyWebhookBody = {
    auth_algo: headerOr('paypal-auth-algo'),
    cert_url: headerOr('paypal-cert-url'),
    transmission_id: headerOr('paypal-transmission-id'),
    transmission_sig: headerOr('paypal-transmission-sig'),
    transmission_time: headerOr('paypal-transmission-time'),
    webhook_id: webhookId,
    webhook_event: JSON.parse(rawBody),
  };

  const res = await fetch(
    `${paypalApiBase()}/v1/notifications/verify-webhook-signature`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(verifyBody),
    }
  );

  if (!res.ok) {
    console.error('[paypal webhook] verify call failed', res.status, await res.text().catch(() => ''));
    return false;
  }
  const json = (await res.json()) as { verification_status?: string };
  // Log the full verification result so we can see exactly what PayPal said.
  console.log('[paypal webhook] verify result', {
    verification_status: json.verification_status,
    webhook_id_used_full: webhookId,
    webhook_id_length: webhookId.length,
    paypal_cert_url: req.headers.get('paypal-cert-url'),
    paypal_auth_algo: req.headers.get('paypal-auth-algo'),
    transmission_id: req.headers.get('paypal-transmission-id'),
  });
  return json.verification_status === 'SUCCESS';
}

/**
 * Pull the booking ID from a PAYMENT.CAPTURE.COMPLETED event. The capture
 * resource lives at event.resource. The reference_id we set on the order
 * lives in supplementary_data.related_ids.order_id (the order ID), but we
 * stamped our internal booking UUID onto purchase_units[].reference_id
 * — the SDK echoes that back via custom_id OR via the parent order, which
 * we look up if needed.
 */
function extractBookingId(event: any): string | null {
  // For PAYMENT.CAPTURE.* events, PayPal includes the supplementary_data
  // with the parent order ID; the booking UUID lives on the order's
  // purchase_unit.reference_id. PayPal also exposes a `custom_id` directly
  // on the capture if we set it on the order's purchase_unit.
  const r = event?.resource;
  if (!r) return null;

  // Most direct: custom_id (we don't currently set this — fall through).
  if (typeof r.custom_id === 'string' && r.custom_id) return r.custom_id;

  // Fallback: invoice_id (also unset by us).
  if (typeof r.invoice_id === 'string' && r.invoice_id) return r.invoice_id;

  // Some payloads include the supplementary order ID; we can call PayPal
  // back to fetch the order and its reference_id, but that's an extra
  // round-trip. Cleaner long-term: also set custom_id on the order.
  return null;
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();

  // Log every incoming POST so we can confirm webhook delivery even when
  // signature verification fails. Helps diagnose env-var / config issues.
  let parsedEventType = '(unparseable)';
  try {
    parsedEventType = JSON.parse(rawBody)?.event_type ?? '(no event_type)';
  } catch {
    /* ignore parse failures */
  }
  console.log('[paypal webhook] POST received', {
    event_type: parsedEventType,
    transmission_id: req.headers.get('paypal-transmission-id'),
    body_length: rawBody.length,
    has_webhook_id_env: Boolean(process.env.PAYPAL_WEBHOOK_ID),
    webhook_id_prefix: process.env.PAYPAL_WEBHOOK_ID?.slice(0, 6),
  });

  if (!process.env.PAYPAL_WEBHOOK_ID) {
    console.error('[paypal webhook] missing PAYPAL_WEBHOOK_ID env var');
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 });
  }

  const valid = await verifyWebhook(req, rawBody);
  if (!valid) {
    console.error('[paypal webhook] signature verification FAILED', {
      transmission_id: req.headers.get('paypal-transmission-id'),
      body_length: rawBody.length,
      body_preview: rawBody.slice(0, 200),
    });
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  let event: any;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const eventType: string | undefined = event?.event_type;

  if (eventType === 'PAYMENT.CAPTURE.COMPLETED') {
    let bookingId = extractBookingId(event);

    // Fallback: if custom_id/invoice_id wasn't set on the capture, look up
    // the parent order and pull our reference_id off its purchase_unit.
    if (!bookingId) {
      const orderId =
        event?.resource?.supplementary_data?.related_ids?.order_id ||
        event?.resource?.id;
      if (orderId) {
        const accessToken = await getAccessToken();
        if (accessToken) {
          try {
            const orderRes = await fetch(
              `${paypalApiBase()}/v2/checkout/orders/${orderId}`,
              { headers: { Authorization: `Bearer ${accessToken}` } }
            );
            if (orderRes.ok) {
              const order = (await orderRes.json()) as any;
              bookingId =
                order?.purchase_units?.[0]?.reference_id ||
                order?.purchase_units?.[0]?.custom_id ||
                null;
            }
          } catch (err) {
            console.error('[paypal webhook] order lookup failed', err);
          }
        }
      }
    }

    if (!bookingId) {
      console.error('[paypal webhook] could not extract booking ID from event', event);
      return NextResponse.json({ ok: true, warning: 'no booking id' });
    }

    // Mirror the Square webhook: flip deposit_paid + advance status to
    // 'confirmed' if it's still 'approved' or 'pending'. Don't clobber
    // later admin moves like 'in_progress' or 'completed'.
    const { error } = await supabaseAdmin
      .from('bookings')
      .update({ deposit_paid: true, status: 'confirmed' })
      .eq('id', bookingId)
      .in('status', ['approved', 'pending']);

    if (error) {
      console.error('[paypal webhook] DB update failed', { bookingId, error });
      return NextResponse.json({ error: 'DB update failed' }, { status: 500 });
    }

    // Belt-and-suspenders: deposit_paid=true regardless of status.
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
  } else if (eventType === 'PAYMENT.CAPTURE.DENIED') {
    console.warn('[paypal webhook] capture denied', {
      capture_id: event?.resource?.id,
      reason: event?.resource?.status_details?.reason,
    });
  }

  return NextResponse.json({ ok: true });
}
