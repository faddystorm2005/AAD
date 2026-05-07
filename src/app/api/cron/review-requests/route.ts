import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { renderReviewRequestEmail } from '@/lib/emails/review-request';

export const dynamic = 'force-dynamic';

// Posts directly to the Resend HTTP API instead of importing the resend SDK,
// matching the existing pattern in src/lib/notify.ts. Keeps this route on
// the Edge-friendly fetch surface and avoids adding a runtime dependency.
const RESEND_API = 'https://api.resend.com/emails';

type EligibleBooking = {
  id: string;
  completed_at: string;
  photo_permission: boolean | null;
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

  // Date window: completed at least 24h ago, no more than 14 days ago
  const cutoff24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const cutoff14d = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);

  // Fetch eligible bookings with joined profile + vehicle
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
    console.error('[review-requests] DB query error:', error);
    return NextResponse.json({ error: 'db_error' }, { status: 500 });
  }

  // Drop bookings whose profile has no email (rare; the schema allows null)
  const bookings = ((rows as unknown as EligibleBooking[]) ?? []).filter(
    (b) => !!b.profiles?.email
  );

  const results = { found: bookings.length, sent: 0, failed: 0 };

  for (const booking of bookings) {
    try {
      const fullName = booking.profiles.full_name?.trim() ?? '';
      const firstName = fullName.split(/\s+/)[0] || 'there';

      const vehicleStr = booking.vehicles
        ? [booking.vehicles.year, booking.vehicles.make, booking.vehicles.model]
            .filter(Boolean)
            .join(' ')
            .trim()
        : '';

      const serviceDateFormatted = new Date(booking.completed_at).toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        timeZone: 'America/Chicago',
      });

      const { subject, html, text } = renderReviewRequestEmail({
        firstName,
        vehicle: vehicleStr,
        serviceDateFormatted,
        nextdoorUrl: process.env.NEXTDOOR_RECOMMEND_URL!,
        photoPermission: booking.photo_permission ?? false,
      });

      const sendRes = await fetch(RESEND_API, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'Alex at Austin Auto Detail <info@austin-autodetail.com>',
          to: booking.profiles.email!,
          reply_to: 'info@austin-autodetail.com',
          subject,
          html,
          text,
        }),
      });

      if (!sendRes.ok) {
        const errBody = (await sendRes.text()).slice(0, 300);
        throw new Error(`Resend HTTP ${sendRes.status}: ${errBody}`);
      }

      // Mark sent ONLY after successful send
      const { error: updateErr } = await supabaseAdmin
        .from('bookings')
        .update({ review_request_sent_at: new Date().toISOString() })
        .eq('id', booking.id);

      if (updateErr) {
        console.error(`[review-requests] Sent email but failed to mark booking ${booking.id}:`, updateErr);
        // Email already sent. Logged loudly. Risk of re-send tomorrow. Acceptable for v1.
      }

      results.sent++;
    } catch (err) {
      console.error(`[review-requests] Failed for booking ${booking.id}:`, err);
      results.failed++;
    }
  }

  console.log('[review-requests] Run complete:', results);
  return NextResponse.json({ ok: true, ...results });
}
