import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type StalledBooking = {
  id: string;
  completed_at: string;
  photo_permission: boolean | null;
  profiles: {
    full_name: string | null;
    email: string | null;
  } | null;
};

/**
 * GET /api/admin/system-health/review-requests
 *
 * Returns bookings that should have had a review-request email sent by
 * the daily cron but didn't, after a 48h grace window. The cron retries
 * every day, so a one-day Resend hiccup self-heals; anything still
 * unsent past 48 hours has missed at least one retry and is genuinely
 * broken (no email on file, send rejected, DB update failed, etc.).
 *
 * Response intentionally returns `email_present: boolean` instead of
 * the email string itself: admins triaging this do not need PII, only
 * the signal "no email on file" vs "email present, send is the bug".
 */
export async function GET(req: NextRequest) {
  // Auth: same bearer-token + is_admin pattern as the rest of /api/admin/*.
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
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const cutoff48h = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();

  const { data: rows, error } = await supabaseAdmin
    .from('bookings')
    .select(`
      id,
      completed_at,
      photo_permission,
      profiles ( full_name, email )
    `)
    .eq('status', 'completed')
    .not('completed_at', 'is', null)
    .lte('completed_at', cutoff48h)
    .is('review_request_sent_at', null)
    .order('completed_at', { ascending: false })
    .limit(50);

  if (error) {
    console.error('[admin/system-health/review-requests]', error);
    return NextResponse.json({ error: 'db_error' }, { status: 500 });
  }

  const stalled = ((rows as unknown as StalledBooking[]) ?? []).map((b) => {
    const fullName = b.profiles?.full_name?.trim() ?? '';
    const firstName = fullName.split(/\s+/)[0] || 'Unknown';
    const hoursStalled = Math.floor(
      (Date.now() - new Date(b.completed_at).getTime()) / (60 * 60 * 1000)
    );

    return {
      id: b.id,
      first_name: firstName,
      completed_at: b.completed_at,
      hours_stalled: hoursStalled,
      photo_permission: b.photo_permission ?? false,
      email_present: !!b.profiles?.email, // boolean only, no PII
    };
  });

  return NextResponse.json({
    count: stalled.length,
    stalled,
  });
}
