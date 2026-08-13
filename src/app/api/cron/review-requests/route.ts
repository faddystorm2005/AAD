import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { renderReviewRequestEmail } from '@/lib/emails/review-request';
import { renderReviewRequestFollowupEmail } from '@/lib/emails/review-request-followup';

export const dynamic = 'force-dynamic';

// Posts directly to the Resend HTTP API instead of importing the resend SDK,
// matching the existing pattern in src/lib/notify.ts. Keeps this route on
// the Edge-friendly fetch surface and avoids adding a runtime dependency.
const RESEND_API = 'https://api.resend.com/emails';
const FROM_ADDRESS = 'Signature Mobile Detailing <info@austin-autodetail.com>';
const REPLY_TO_ADDRESS = 'info@austin-autodetail.com';

type EligibleBooking = {
  id: string;
  completed_at: string;
  photo_permission: boolean | null;
  // Present in the followup query so the helper can read both. The initial
  // query doesn't request it; it stays undefined there, which is fine.
  review_request_sent_at?: string | null;
  profiles: {
    full_name: string | null;
    email: string | null;
  };
  vehicles: {
    year: number;
    make: string;
    model: string;
  } | null;
};

type PassResult = {
  found: number;
  sent: number;
  failed: number;
  db_error?: boolean;
};

export async function GET(req: NextRequest) {
  // Auth
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Env var sanity check
  if (!process.env.NEXTDOOR_RECOMMEND_URL) {
    console.warn('[review-requests] NEXTDOOR_RECOMMEND_URL not set, skipping run');
    return NextResponse.json({ ok: false, reason: 'missing_nextdoor_url' });
  }
  if (!process.env.RESEND_API_KEY) {
    console.warn('[review-requests] RESEND_API_KEY not set, skipping run');
    return NextResponse.json({ ok: false, reason: 'missing_resend_key' });
  }

  const nextdoorUrl = process.env.NEXTDOOR_RECOMMEND_URL!;
  const resendKey = process.env.RESEND_API_KEY!;

  // Pass 1: initial review requests (24h to 14d after completion).
  const initial = await sendInitialPass(resendKey, nextdoorUrl);

  // Pass 2: 7-day follow-ups (initial sent 7d to 21d ago, no follow-up yet).
  // Independent of pass 1: a DB error in one does not skip the other.
  const followup = await sendFollowupPass(resendKey, nextdoorUrl);

  console.log('[review-requests] Run complete:', { initial, followup });
  return NextResponse.json({ ok: true, initial, followup });
}

async function sendInitialPass(resendKey: string, nextdoorUrl: string): Promise<PassResult> {
  // Date window: completed at least 24h ago, no more than 14 days ago.
  const cutoff24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const cutoff14d = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);

  const { data: rows, error } = await supabaseAdmin
    .from('bookings')
    .select(`
      id,
      completed_at,
      photo_permission,
      profiles!inner ( full_name, email ),
      vehicles ( year, make, model )
    `)
    .eq('status', 'completed')
    .not('completed_at', 'is', null)
    .lte('completed_at', cutoff24h.toISOString())
    .gte('completed_at', cutoff14d.toISOString())
    .is('review_request_sent_at', null);

  if (error) {
    console.error('[review-requests/initial] DB query error:', error);
    return { found: 0, sent: 0, failed: 0, db_error: true };
  }

  const bookings = ((rows as unknown as EligibleBooking[]) ?? []).filter(
    (b) => !!b.profiles?.email
  );
  const results: PassResult = { found: bookings.length, sent: 0, failed: 0 };

  for (const booking of bookings) {
    try {
      const { firstName, vehicleStr } = extractCustomerVehicle(booking);
      const serviceDateFormatted = formatDateChicago(booking.completed_at);

      const { subject, html, text } = renderReviewRequestEmail({
        firstName,
        vehicle: vehicleStr,
        serviceDateFormatted,
        nextdoorUrl,
        photoPermission: booking.photo_permission ?? false,
      });

      await sendResendEmail(resendKey, {
        to: booking.profiles.email!,
        subject,
        html,
        text,
      });

      // Mark sent ONLY after successful send
      const { error: updateErr } = await supabaseAdmin
        .from('bookings')
        .update({ review_request_sent_at: new Date().toISOString() })
        .eq('id', booking.id);

      if (updateErr) {
        console.error(
          `[review-requests/initial] Sent email but failed to mark booking ${booking.id}:`,
          updateErr
        );
        // Email already sent. Logged loudly. Risk of re-send tomorrow. Acceptable for v1.
      }

      results.sent++;
    } catch (err) {
      console.error(`[review-requests/initial] Failed for booking ${booking.id}:`, err);
      results.failed++;
    }
  }

  return results;
}

async function sendFollowupPass(resendKey: string, nextdoorUrl: string): Promise<PassResult> {
  // Date window: initial email landed 7 to 21 days ago, no follow-up yet.
  // The 21-day ceiling guards against pathological cases where the cron was
  // broken for weeks; we don't want to suddenly email a month of customers.
  const cutoff7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const cutoff21d = new Date(Date.now() - 21 * 24 * 60 * 60 * 1000);

  const { data: rows, error } = await supabaseAdmin
    .from('bookings')
    .select(`
      id,
      completed_at,
      photo_permission,
      review_request_sent_at,
      profiles!inner ( full_name, email ),
      vehicles ( year, make, model )
    `)
    .not('review_request_sent_at', 'is', null)
    .lte('review_request_sent_at', cutoff7d.toISOString())
    .gte('review_request_sent_at', cutoff21d.toISOString())
    .is('review_request_followup_sent_at', null);

  if (error) {
    console.error('[review-requests/followup] DB query error:', error);
    return { found: 0, sent: 0, failed: 0, db_error: true };
  }

  const bookings = ((rows as unknown as EligibleBooking[]) ?? []).filter(
    (b) => !!b.profiles?.email
  );
  const results: PassResult = { found: bookings.length, sent: 0, failed: 0 };

  for (const booking of bookings) {
    try {
      const { firstName, vehicleStr } = extractCustomerVehicle(booking);

      const { subject, html, text } = renderReviewRequestFollowupEmail({
        firstName,
        vehicle: vehicleStr,
        nextdoorUrl,
      });

      await sendResendEmail(resendKey, {
        to: booking.profiles.email!,
        subject,
        html,
        text,
      });

      const { error: updateErr } = await supabaseAdmin
        .from('bookings')
        .update({ review_request_followup_sent_at: new Date().toISOString() })
        .eq('id', booking.id);

      if (updateErr) {
        console.error(
          `[review-requests/followup] Sent email but failed to mark booking ${booking.id}:`,
          updateErr
        );
      }

      results.sent++;
    } catch (err) {
      console.error(`[review-requests/followup] Failed for booking ${booking.id}:`, err);
      results.failed++;
    }
  }

  return results;
}

// Helpers

function extractCustomerVehicle(booking: EligibleBooking): {
  firstName: string;
  vehicleStr: string;
} {
  const fullName = booking.profiles.full_name?.trim() ?? '';
  const firstName = fullName.split(/\s+/)[0] || 'there';
  const vehicleStr = booking.vehicles
    ? [booking.vehicles.year, booking.vehicles.make, booking.vehicles.model]
        .filter(Boolean)
        .join(' ')
        .trim()
    : '';
  return { firstName, vehicleStr };
}

function formatDateChicago(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    timeZone: 'America/Phoenix',
  });
}

async function sendResendEmail(
  resendKey: string,
  opts: { to: string; subject: string; html: string; text: string }
): Promise<void> {
  const sendRes = await fetch(RESEND_API, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: FROM_ADDRESS,
      to: opts.to,
      reply_to: REPLY_TO_ADDRESS,
      subject: opts.subject,
      html: opts.html,
      text: opts.text,
    }),
  });

  if (!sendRes.ok) {
    const errBody = (await sendRes.text()).slice(0, 300);
    throw new Error(`Resend HTTP ${sendRes.status}: ${errBody}`);
  }
}
