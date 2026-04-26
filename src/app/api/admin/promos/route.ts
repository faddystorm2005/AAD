import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Admin-only promo code management.
 *
 *   GET    /api/admin/promos          → list all codes
 *   POST   /api/admin/promos          → create new code
 *   DELETE /api/admin/promos?id=...   → deactivate / delete a code
 */

async function requireAdmin(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const accessToken = authHeader?.startsWith('Bearer ')
    ? authHeader.slice('Bearer '.length)
    : null;

  if (!accessToken) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  const userClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${accessToken}` } } }
  );

  const { data: userData } = await userClient.auth.getUser();
  if (!userData?.user) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('is_admin')
    .eq('id', userData.user.id)
    .single();

  if (!profile?.is_admin) {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }

  return { userId: userData.user.id };
}

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if ('error' in auth) return auth.error;

  const { data, error } = await supabaseAdmin
    .from('promo_codes')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message, promos: [] }, { status: 500 });
  }
  return NextResponse.json({ promos: data ?? [] });
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req);
  if ('error' in auth) return auth.error;

  const body = await req.json().catch(() => null);
  const codeRaw: string | undefined = body?.code;
  const rateRaw = Number(body?.rate);
  const maxUsesRaw = body?.maxUses == null || body.maxUses === '' ? null : Number(body.maxUses);
  const expiresAt: string | null = body?.expiresAt || null;

  if (!codeRaw || !codeRaw.trim()) {
    return NextResponse.json({ error: 'Code is required' }, { status: 400 });
  }
  if (!Number.isFinite(rateRaw)) {
    return NextResponse.json({ error: 'Rate must be a number' }, { status: 400 });
  }
  if (maxUsesRaw != null && (!Number.isFinite(maxUsesRaw) || maxUsesRaw < 1)) {
    return NextResponse.json({ error: 'Max uses must be a positive number or empty' }, { status: 400 });
  }

  const code = codeRaw.trim().toUpperCase();
  const rate = Math.max(1, Math.min(50, Math.round(rateRaw)));
  const maxUses = maxUsesRaw == null ? null : Math.round(maxUsesRaw);

  const { data, error } = await supabaseAdmin
    .from('promo_codes')
    .insert({
      code,
      discount_rate: rate,
      max_uses: maxUses,
      uses_count: 0,
      expires_at: expiresAt,
      active: true,
    })
    .select()
    .single();

  if (error) {
    if (error.message.includes('duplicate') || error.code === '23505') {
      return NextResponse.json({ error: `Code "${code}" already exists.` }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, promo: data });
}

export async function DELETE(req: NextRequest) {
  const auth = await requireAdmin(req);
  if ('error' in auth) return auth.error;

  const id = req.nextUrl.searchParams.get('id');
  if (!id) {
    return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  }

  const { error } = await supabaseAdmin.from('promo_codes').delete().eq('id', id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
