import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/capacity
 * Body: { day: 'YYYY-MM-DD', isHelpAvailable: boolean }
 * Admin-only. Upserts a row in daily_capacity for the day.
 */
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

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('is_admin')
    .eq('id', userData.user.id)
    .single();

  if (!profile?.is_admin) {
    return NextResponse.json(
      { error: 'Forbidden: your account is not an admin' },
      { status: 403 }
    );
  }

  const body = await req.json().catch(() => null);
  const day: string | undefined = body?.day;
  const isHelpAvailable: boolean = Boolean(body?.isHelpAvailable);

  if (!day || !/^\d{4}-\d{2}-\d{2}$/.test(day)) {
    return NextResponse.json({ error: 'Invalid day (YYYY-MM-DD required)' }, { status: 400 });
  }

  const { error } = await supabaseAdmin
    .from('daily_capacity')
    .upsert(
      { day, is_help_available: isHelpAvailable, updated_at: new Date().toISOString() },
      { onConflict: 'day' }
    );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
