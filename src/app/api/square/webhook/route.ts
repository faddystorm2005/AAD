import { NextRequest, NextResponse } from 'next/server';
import { WebhooksHelper } from 'square';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { pushBookingToGoogle, findAdminUserId } from '@/lib/googleCalendar';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signatureHeader = req.headers.get('x-square-hmacsha256-signature');
  const signatureKey = process.env.SQUARE_WEBHOOK_SIGNATURE_KEY;
  const notificationUrl = process.env.SQUARE_WEBHOOK_NOTIFICATION_URL;

  if (!signatureKey || !notificationUrl) {
    console.error('Square webhook not configured: missing SQUARE_WEBHOOK_SIGNATURE_KEY or SQUARE_WEBHOOK_NOTIFICATION_URL');
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 });
  }

  if (!signatureHeader) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 401 });
  }

  const valid = await WebhooksHelper.verifySignature({
    requestBody: rawBody,
    signatureHeader,
    signatureKey,
    notificationUrl,
  });

  if (!valid) {
    console.error('[square webhook] signature verification FAILED', {
      expected_url: notificationUrl,
      received_url_header: req.headers.get('x-forwarded-proto') + '://' + req.headers.get('host') + req.nextUrl.pathname,
      signature_header_present: Boolean(signatureHeader),
      signature_key_length: signatureKey.length,
      signature_key_first4: signatureKey.slice(0, 4),
      body_length: rawBody.length,
      body_preview: rawBody.slice(0, 120),
    });
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  let event: any;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const type: string | undefined = event?.type;

  // We care about payment completions on payment links we created.
  // Square sends `payment.created` / `payment.updated` with a payment that
  // includes the reference_id we set on the order (= booking id).
  if (type === 'payment.updated' || type === 'payment.created') {
    const payment = event?.data?.object?.payment;
    const status: string | undefined = payment?.status;
    const bookingId: string | undefined =
      payment?.reference_id || payment?.order?.reference_id || payment?.note;

    if (status === 'COMPLETED' && bookingId) {
      // === Idempotency + amount check (mirror of PayPal's P0-4 fix).
      //
      // Square sends a unique event_id at the root of every webhook event.
      // We use it as the idempotency key (same payment_events table).
      // Square's amount_money.amount is already in cents (integer).
      const eventId: string | undefined = event?.event_id;
      if (!eventId) {
        console.error('[square webhook] missing event_id', { bookingId });
        return NextResponse.json({ ok: true, warning: 'no event_id' });
      }

      const amountMoney = payment?.amount_money;
      const capturedCents: number | undefined =
        typeof amountMoney?.amount === 'number'
          ? amountMoney.amount
          : typeof amountMoney?.amount === 'string'
            ? parseInt(amountMoney.amount, 10)
            : undefined;
      const capturedCurrency: string | undefined = amountMoney?.currency;
      if (capturedCents === undefined || !capturedCurrency) {
        console.error('[square webhook] payment missing amount/currency', {
          bookingId,
          eventId,
        });
        return NextResponse.json({ ok: true, warning: 'malformed amount' });
      }

      const { data: bookingRow, error: bookingErr } = await supabaseAdmin
        .from('bookings')
        .select('id, deposit_amount')
        .eq('id', bookingId)
        .single();

      if (bookingErr || !bookingRow) {
        console.error('[square webhook] booking lookup failed', {
          bookingId,
          eventId,
          bookingErr,
        });
        return NextResponse.json({ ok: true, warning: 'booking not found' });
      }

      const expectedCents = Math.round(Number(bookingRow.deposit_amount) * 100);
      const amountOk =
        Number.isFinite(capturedCents) &&
        capturedCents === expectedCents &&
        capturedCurrency === 'USD';

      if (!amountOk) {
        console.error('[square webhook] AMOUNT MISMATCH - not marking paid', {
          bookingId,
          eventId,
          expectedDeposit: bookingRow.deposit_amount,
          expectedCents,
          capturedCents,
          capturedCurrency,
        });
        return NextResponse.json({ ok: true, warning: 'amount mismatch' });
      }

      const { error: idempErr } = await supabaseAdmin
        .from('payment_events')
        .insert({
          transmission_id: eventId,
          booking_id: bookingId,
          provider: 'square',
          amount: (capturedCents / 100).toFixed(2),
          currency_code: capturedCurrency,
          event_type: type,
        });

      if (idempErr) {
        // 23505 = unique_violation. Replay or duplicate delivery.
        if ((idempErr as { code?: string }).code === '23505') {
          console.log('[square webhook] replay ignored', { bookingId, eventId });
          return NextResponse.json({ ok: true, replay: true });
        }
        console.error('[square webhook] payment_events insert failed', {
          bookingId,
          eventId,
          idempErr,
        });
        return NextResponse.json({ error: 'idempotency insert failed' }, { status: 500 });
      }

      // Flip deposit_paid + advance status to 'confirmed' if it's still in
      // 'approved' (or 'pending' for safety on legacy rows). Don't clobber
      // later admin moves like 'in_progress' or 'completed'.
      const { error } = await supabaseAdmin
        .from('bookings')
        .update({ deposit_paid: true, status: 'confirmed' })
        .eq('id', bookingId)
        .in('status', ['approved', 'pending']);

      if (error) {
        console.error('Failed to update booking deposit_paid', { bookingId, error });
        return NextResponse.json({ error: 'DB update failed' }, { status: 500 });
      }

      // Belt-and-suspenders: make deposit_paid=true for non-terminal statuses
      // even when the primary update was a no-op (e.g., admin manually
      // confirmed first). Skip terminal statuses so a delayed webhook can't
      // re-mark a cancelled/declined booking as paid.
      await supabaseAdmin
        .from('bookings')
        .update({ deposit_paid: true })
        .eq('id', bookingId)
        .eq('deposit_paid', false)
        .in('status', ['approved', 'pending', 'confirmed', 'in_progress']);

      // Sync confirmed status to Google Calendar.
      const adminId = await findAdminUserId();
      if (adminId) {
        await pushBookingToGoogle(adminId, bookingId);
      }
    }
  }

  return NextResponse.json({ ok: true });
}
