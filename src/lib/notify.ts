/**
 * SMS (Twilio) + Email (Resend) notifications.
 *
 * Both helpers are best-effort: they never throw - the caller's main flow
 * (booking creation, stage update, etc.) must keep working even if
 * notifications fail or aren't configured.
 *
 * Required env vars (set in Vercel → Settings → Environment Variables):
 *   TWILIO_ACCOUNT_SID
 *   TWILIO_AUTH_TOKEN
 *   TWILIO_FROM_NUMBER       - Twilio number that sends SMS, e.g. "+14805550100"
 *   ADMIN_NOTIFY_PHONE       - Admin's phone, e.g. "+14805559999"
 *   RESEND_API_KEY
 *   NOTIFY_FROM_EMAIL        - verified sender, e.g. "alerts@__TIKTOK_TBD__.com"
 *
 * If env vars are missing, the helpers log "[notify] skipped" and return.
 */

import { supabaseAdmin } from './supabaseAdmin';

const TWILIO_BASE = 'https://api.twilio.com/2010-04-01/Accounts';
const RESEND_API = 'https://api.resend.com/emails';

interface SmsResult {
  ok: boolean;
  skipped?: boolean;
  reason?: string;
}

interface EmailResult {
  ok: boolean;
  skipped?: boolean;
  reason?: string;
}

/**
 * Light phone-number normalization. Twilio requires E.164 (e.g., +14805551234).
 * If the input has no leading +, assume US/Canada (+1).
 */
export function normalizePhone(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const digits = raw.replace(/[^\d+]/g, '');
  if (!digits) return null;
  if (digits.startsWith('+')) return digits;
  // 10 digits → US: prepend +1
  if (digits.length === 10) return `+1${digits}`;
  // 11 digits starting with 1 → US: prepend +
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
  // Otherwise pass through with + (best-effort).
  return `+${digits}`;
}

export async function sendSms(toRaw: string, body: string): Promise<SmsResult> {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_FROM_NUMBER;

  if (!sid || !token || !from) {
    console.log('[notify] sms skipped: missing TWILIO_* env vars');
    return { ok: false, skipped: true, reason: 'not_configured' };
  }

  const to = normalizePhone(toRaw);
  if (!to) {
    return { ok: false, skipped: true, reason: 'invalid_phone' };
  }

  try {
    const res = await fetch(`${TWILIO_BASE}/${sid}/Messages.json`, {
      method: 'POST',
      headers: {
        Authorization: 'Basic ' + Buffer.from(`${sid}:${token}`).toString('base64'),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ To: to, From: from, Body: body }),
    });

    if (!res.ok) {
      const text = (await res.text()).slice(0, 300);
      console.error('[notify] sms failed', res.status, text);
      return { ok: false, reason: `twilio_${res.status}` };
    }
    return { ok: true };
  } catch (err) {
    console.error('[notify] sms exception', err);
    return { ok: false, reason: 'exception' };
  }
}

export async function sendEmail(opts: {
  to: string;
  subject: string;
  html: string;
  text?: string;
}): Promise<EmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.NOTIFY_FROM_EMAIL;

  if (!apiKey || !from) {
    console.log('[notify] email skipped: missing RESEND_API_KEY / NOTIFY_FROM_EMAIL');
    return { ok: false, skipped: true, reason: 'not_configured' };
  }
  if (!opts.to) {
    return { ok: false, skipped: true, reason: 'no_recipient' };
  }

  try {
    const res = await fetch(RESEND_API, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: opts.to,
        subject: opts.subject,
        html: opts.html,
        text: opts.text,
      }),
    });
    if (!res.ok) {
      const text = (await res.text()).slice(0, 300);
      console.error('[notify] email failed', res.status, text);
      return { ok: false, reason: `resend_${res.status}` };
    }
    return { ok: true };
  } catch (err) {
    console.error('[notify] email exception', err);
    return { ok: false, reason: 'exception' };
  }
}

/**
 * Notify the admin when a new booking comes in.
 *
 * Sends SMS to the phone configured via ADMIN_NOTIFY_PHONE (or, if unset,
 * the admin user's profile.phone).
 */
export async function notifyAdminNewBooking(opts: {
  bookingId: string;
  customerName: string | null;
  customerPhone: string | null;
  service: string;
  scheduledAt: string | null;
  address: string;
}): Promise<void> {
  let to = process.env.ADMIN_NOTIFY_PHONE || null;
  if (!to) {
    const { data: admin } = await supabaseAdmin
      .from('profiles')
      .select('phone')
      .eq('is_admin', true)
      .not('phone', 'is', null)
      .limit(1)
      .maybeSingle();
    to = admin?.phone ?? null;
  }
  if (!to) {
    console.log('[notify] admin sms skipped: no admin phone configured');
    return;
  }

  // No time slot in the request model: show "needs scheduling" instead of a date.
  const when = opts.scheduledAt
    ? new Date(opts.scheduledAt).toLocaleString('en-US', {
        timeZone: 'America/Phoenix',
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      })
    : '⏱ Needs scheduling - reach out to set a time';

  const body =
    `🚗 NEW DETAIL REQUEST - Signature Mobile Detailing\n` +
    `${opts.customerName || 'Customer'}: ${opts.service}\n` +
    `${when}\n` +
    `${opts.address}\n` +
    (opts.customerPhone ? `📞 ${opts.customerPhone}\n` : '') +
    `\nApprove: https://__TIKTOK_TBD__.vercel.app/admin`;

  await sendSms(to, body);
}

/**
 * Notify the customer when their car is ready (booking_stage='done').
 * Sends both SMS (primary) and email (backup), in parallel. Best-effort.
 */
export async function notifyCustomerCarReady(opts: {
  customerName: string | null;
  customerPhone: string | null;
  customerEmail: string | null;
  service: string;
  bookingId: string;
}): Promise<void> {
  const name = opts.customerName?.split(' ')[0] || 'there';

  const smsBody =
    `Hey ${name}! 🚗✨ Your ${opts.service} is complete. ` +
    `Thanks for choosing Signature Mobile Detailing - see you next time!`;

  const emailHtml = `
    <div style="font-family: -apple-system, system-ui, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; background: #000; color: #f8f8f8;">
      <div style="text-align: center; padding-bottom: 24px; border-bottom: 1px solid rgba(255,255,255,0.1);">
        <p style="font-size: 28px; font-weight: 800; letter-spacing: 0.06em; color: #d4a24c; margin: 0;">SIGNATURE</p>
        <p style="font-size: 11px; letter-spacing: 0.32em; color: #f8f8f8; margin: 6px 0 0;">MOBILE DETAILING</p>
      </div>
      <h1 style="font-size: 22px; font-weight: 600; color: #fff; margin: 24px 0 12px;">Your car is ready! 🚗✨</h1>
      <p style="color: #c8c8c8; line-height: 1.6;">Hey ${name},</p>
      <p style="color: #c8c8c8; line-height: 1.6;">Your <strong style="color: #fff;">${opts.service}</strong> is complete. Thanks for choosing Signature Mobile Detailing - we'd love to see you again.</p>
      <p style="color: #888; font-size: 12px; margin-top: 32px;">- Signature Mobile Detailing</p>
    </div>
  `;

  const promises: Promise<unknown>[] = [];
  if (opts.customerPhone) promises.push(sendSms(opts.customerPhone, smsBody));
  if (opts.customerEmail) {
    promises.push(
      sendEmail({
        to: opts.customerEmail,
        subject: 'Your car is ready! 🚗',
        html: emailHtml,
        text: smsBody,
      })
    );
  }
  await Promise.allSettled(promises);
}

/**
 * Tell the admin a customer requested a cancellation. Booking is still
 * in its prior status; admin needs to log into /admin to approve or deny.
 */
export async function notifyAdminCancellationRequest(opts: {
  bookingId: string;
  customerName: string | null;
  customerPhone: string | null;
  service: string;
  scheduledAt: string;
  reason: string | null;
}): Promise<void> {
  let to = process.env.ADMIN_NOTIFY_PHONE || null;
  if (!to) {
    const { data: admin } = await supabaseAdmin
      .from('profiles')
      .select('phone')
      .eq('is_admin', true)
      .not('phone', 'is', null)
      .limit(1)
      .maybeSingle();
    to = admin?.phone ?? null;
  }
  if (!to) {
    console.log('[notify] cancel-request sms skipped: no admin phone configured');
    return;
  }

  const when = new Date(opts.scheduledAt).toLocaleString('en-US', {
    timeZone: 'America/Phoenix',
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

  const body =
    `⚠️ CANCEL REQUEST - Signature Mobile Detailing\n` +
    `${opts.customerName || 'Customer'}: ${opts.service}\n` +
    `${when}\n` +
    (opts.customerPhone ? `📞 ${opts.customerPhone}\n` : '') +
    (opts.reason ? `Reason: ${opts.reason}\n` : '') +
    `\nReview: https://__TIKTOK_TBD__.vercel.app/admin`;

  await sendSms(to, body);
}

/**
 * Tell the customer their cancellation was approved. If account credit was
 * issued, mention the dollar amount and where to find it.
 */
export async function notifyCustomerCancellationApproved(opts: {
  customerName: string | null;
  customerPhone: string | null;
  customerEmail: string | null;
  service: string;
  creditIssued: number;
}): Promise<void> {
  const name = opts.customerName?.split(' ')[0] || 'there';
  const creditLine =
    opts.creditIssued > 0
      ? ` We've added a $${opts.creditIssued.toFixed(2)} account credit toward your next booking.`
      : '';

  const smsBody =
    `Hi ${name}, your cancellation for "${opts.service}" was approved.` +
    `${creditLine} - Signature Mobile Detailing`;

  const emailHtml = `
    <div style="font-family: -apple-system, system-ui, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; background: #000; color: #f8f8f8;">
      <div style="text-align: center; padding-bottom: 24px; border-bottom: 1px solid rgba(255,255,255,0.1);">
        <p style="font-size: 28px; font-weight: 800; letter-spacing: 0.06em; color: #d4a24c; margin: 0;">SIGNATURE</p>
        <p style="font-size: 11px; letter-spacing: 0.32em; color: #f8f8f8; margin: 6px 0 0;">MOBILE DETAILING</p>
      </div>
      <h1 style="font-size: 22px; font-weight: 600; color: #fff; margin: 24px 0 12px;">Cancellation approved</h1>
      <p style="color: #c8c8c8; line-height: 1.6;">Hi ${name},</p>
      <p style="color: #c8c8c8; line-height: 1.6;">Your cancellation for <strong style="color: #fff;">${opts.service}</strong> has been approved.</p>
      ${
        opts.creditIssued > 0
          ? `<p style="color: #c8c8c8; line-height: 1.6;">We added a <strong style="color: #fff;">$${opts.creditIssued.toFixed(
              2
            )}</strong> account credit. It will apply automatically to your next booking.</p>`
          : ''
      }
      <p style="color: #888; font-size: 12px; margin-top: 32px;">- Signature Mobile Detailing</p>
    </div>
  `;

  const promises: Promise<unknown>[] = [];
  if (opts.customerPhone) promises.push(sendSms(opts.customerPhone, smsBody));
  if (opts.customerEmail) {
    promises.push(
      sendEmail({
        to: opts.customerEmail,
        subject: 'Cancellation approved',
        html: emailHtml,
        text: smsBody,
      })
    );
  }
  await Promise.allSettled(promises);
}

/**
 * Tell the customer their cancellation was denied. Includes optional
 * admin note explaining why.
 */
export async function notifyCustomerCancellationDenied(opts: {
  customerName: string | null;
  customerPhone: string | null;
  customerEmail: string | null;
  service: string;
  note: string | null;
}): Promise<void> {
  const name = opts.customerName?.split(' ')[0] || 'there';

  const smsBody =
    `Hi ${name}, your cancellation request for "${opts.service}" was not approved.` +
    (opts.note ? ` Note: ${opts.note}` : '') +
    ` Please reach out if you need help. - Signature Mobile Detailing`;

  const emailHtml = `
    <div style="font-family: -apple-system, system-ui, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; background: #000; color: #f8f8f8;">
      <div style="text-align: center; padding-bottom: 24px; border-bottom: 1px solid rgba(255,255,255,0.1);">
        <p style="font-size: 28px; font-weight: 800; letter-spacing: 0.06em; color: #d4a24c; margin: 0;">SIGNATURE</p>
        <p style="font-size: 11px; letter-spacing: 0.32em; color: #f8f8f8; margin: 6px 0 0;">MOBILE DETAILING</p>
      </div>
      <h1 style="font-size: 22px; font-weight: 600; color: #fff; margin: 24px 0 12px;">Cancellation request update</h1>
      <p style="color: #c8c8c8; line-height: 1.6;">Hi ${name},</p>
      <p style="color: #c8c8c8; line-height: 1.6;">Your cancellation request for <strong style="color: #fff;">${opts.service}</strong> couldn't be approved this time. Your booking is still scheduled.</p>
      ${
        opts.note
          ? `<p style="color: #c8c8c8; line-height: 1.6;"><strong style="color: #fff;">Note:</strong> ${opts.note}</p>`
          : ''
      }
      <p style="color: #c8c8c8; line-height: 1.6;">If something changed, just reply or text us and we'll work it out.</p>
      <p style="color: #888; font-size: 12px; margin-top: 32px;">- Signature Mobile Detailing</p>
    </div>
  `;

  const promises: Promise<unknown>[] = [];
  if (opts.customerPhone) promises.push(sendSms(opts.customerPhone, smsBody));
  if (opts.customerEmail) {
    promises.push(
      sendEmail({
        to: opts.customerEmail,
        subject: 'Cancellation request update',
        html: emailHtml,
        text: smsBody,
      })
    );
  }
  await Promise.allSettled(promises);
}

/**
 * Tell the customer their booking was approved and they need to pay the deposit.
 * Sends SMS + email so customers without push notifications still get notified.
 */
export async function notifyCustomerBookingApproved(opts: {
  customerName: string | null;
  customerPhone: string | null;
  customerEmail: string | null;
  service: string;
}): Promise<void> {
  const name = opts.customerName?.split(' ')[0] || 'there';

  const smsBody =
    `Hi ${name}! Your ${opts.service} request with Signature Mobile Detailing is approved. ` +
    `We'll text you shortly to lock in a time that works. No deposit needed - you pay on-site when the detail is done.`;

  const emailHtml = `
    <div style="font-family: -apple-system, system-ui, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; background: #000; color: #f8f8f8;">
      <div style="text-align: center; padding-bottom: 24px; border-bottom: 1px solid rgba(255,255,255,0.1);">
        <p style="font-size: 28px; font-weight: 800; letter-spacing: 0.06em; color: #d4a24c; margin: 0;">SIGNATURE</p>
        <p style="font-size: 11px; letter-spacing: 0.32em; color: #f8f8f8; margin: 6px 0 0;">MOBILE DETAILING</p>
      </div>
      <h1 style="font-size: 22px; font-weight: 600; color: #fff; margin: 24px 0 12px;">You're approved!</h1>
      <p style="color: #c8c8c8; line-height: 1.6;">Hi ${name},</p>
      <p style="color: #c8c8c8; line-height: 1.6;">Your <strong style="color: #fff;">${opts.service}</strong> request has been approved. We'll reach out by text shortly to lock in a time that works for you.</p>
      <p style="color: #c8c8c8; line-height: 1.6;">No deposit needed - you simply pay on-site once the detail is complete.</p>
      <p style="color: #888; font-size: 12px; margin-top: 32px;">- Signature Mobile Detailing</p>
    </div>
  `;

  const promises: Promise<unknown>[] = [];
  if (opts.customerPhone) promises.push(sendSms(opts.customerPhone, smsBody));
  if (opts.customerEmail) {
    promises.push(
      sendEmail({
        to: opts.customerEmail,
        subject: "You're approved - we'll text you to schedule",
        html: emailHtml,
        text: smsBody,
      })
    );
  }
  await Promise.allSettled(promises);
}

/**
 * Tell the customer their booking was declined. Includes optional reason.
 */
export async function notifyCustomerBookingDeclined(opts: {
  customerName: string | null;
  customerPhone: string | null;
  customerEmail: string | null;
  service: string;
  reason: string | null;
}): Promise<void> {
  const name = opts.customerName?.split(' ')[0] || 'there';

  const smsBody =
    `Hi ${name}, unfortunately we couldn't accommodate your ${opts.service} booking with Signature Mobile Detailing.` +
    (opts.reason ? ` Reason: ${opts.reason}` : '') +
    ` Feel free to book another slot anytime at __TIKTOK_TBD__.vercel.app`;

  const emailHtml = `
    <div style="font-family: -apple-system, system-ui, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; background: #000; color: #f8f8f8;">
      <div style="text-align: center; padding-bottom: 24px; border-bottom: 1px solid rgba(255,255,255,0.1);">
        <p style="font-size: 28px; font-weight: 800; letter-spacing: 0.06em; color: #d4a24c; margin: 0;">SIGNATURE</p>
        <p style="font-size: 11px; letter-spacing: 0.32em; color: #f8f8f8; margin: 6px 0 0;">MOBILE DETAILING</p>
      </div>
      <h1 style="font-size: 22px; font-weight: 600; color: #fff; margin: 24px 0 12px;">Booking update</h1>
      <p style="color: #c8c8c8; line-height: 1.6;">Hi ${name},</p>
      <p style="color: #c8c8c8; line-height: 1.6;">Unfortunately we couldn't accommodate your <strong style="color: #fff;">${opts.service}</strong> booking at this time.</p>
      ${opts.reason ? `<p style="color: #c8c8c8; line-height: 1.6;"><strong style="color: #fff;">Reason:</strong> ${opts.reason}</p>` : ''}
      <p style="color: #c8c8c8; line-height: 1.6;">We'd love to help on another day - feel free to book a new slot anytime.</p>
      <p style="color: #888; font-size: 12px; margin-top: 32px;">- Signature Mobile Detailing</p>
    </div>
  `;

  const promises: Promise<unknown>[] = [];
  if (opts.customerPhone) promises.push(sendSms(opts.customerPhone, smsBody));
  if (opts.customerEmail) {
    promises.push(
      sendEmail({
        to: opts.customerEmail,
        subject: 'Booking update from Signature Mobile Detailing',
        html: emailHtml,
        text: smsBody,
      })
    );
  }
  await Promise.allSettled(promises);
}
