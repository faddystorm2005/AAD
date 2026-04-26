import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/users/discount
 * Body: { userId: string, rate: number (0-50) }
 *
 * Sets a per-user discount rate. Applied to future bookings.
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

  const { data: userData } = await userClient.auth.getUser();
  if (!userData?.user) {
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

  const body = await req.json().catch(() => null);
  const targetUserId: string | undefined = body?.userId;
  const rateRaw = Number(body?.rate);
  const singleUse: boolean = Boolean(body?.singleUse);

  if (!targetUserId || !Number.isFinite(rateRaw)) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }
  const rate = Math.max(0, Math.min(50, Math.round(rateRaw)));

  const { error } = await supabaseAdmin
    .from('profiles')
    .update({ custom_discount_rate: rate, discount_single_use: singleUse })
    .eq('id', targetUserId);

  if (error) {
    // If the column doesn't exist yet, give a friendly hint.
    if (error.message.toLowerCase().includes('custom_discount_rate')) {
      return NextResponse.json(
        {
          error:
            'Discount column is missing. Run: ALTER TABLE profiles ADD COLUMN IF NOT EXISTS custom_discount_rate INTEGER DEFAULT 0;',
        },
        { status: 500 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, rate });
}
