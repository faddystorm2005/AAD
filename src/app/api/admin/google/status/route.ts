import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/google/status
 *
 * Returns whether the current admin has connected Google Calendar.
 * Auth: standard admin bearer token.
 */
export async function GET(req: NextRequest) {
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
  const { data: userData } = await userClient.auth.getUser();
  if (!userData?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Verify admin status with a query that doesn't depend on the new
  // google_* columns existing yet.
  const { data: adminCheck } = await supabaseAdmin
    .from('profiles')
    .select('is_admin')
    .eq('id', userData.user.id)
    .maybeSingle();

  if (!adminCheck?.is_admin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Best-effort lookup - gracefully report "not connected" if the operator
  // hasn't run the schema migration yet (so the column doesn't exist).
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('google_refresh_token, google_calendar_id')
    .eq('id', userData.user.id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ connected: false, calendarId: null });
  }

  return NextResponse.json({
    connected: Boolean(data?.google_refresh_token),
    calendarId: data?.google_calendar_id ?? null,
  });
}
