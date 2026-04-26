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

      // Belt-and-suspenders: always make sure deposit_paid is true regardless
      // of status (e.g., webhook arriving for a manually-confirmed booking).
      await supabaseAdmin
        .from('bookings')
        .update({ deposit_paid: true })
        .eq('id', bookingId)
        .eq('deposit_paid', false);

      // Sync confirmed status to Google Calendar.
      const adminId = await findAdminUserId();
      if (adminId) {
        await pushBookingToGoogle(adminId, bookingId);
      }
    }
  }

  return NextResponse.json({ ok: true });
}
