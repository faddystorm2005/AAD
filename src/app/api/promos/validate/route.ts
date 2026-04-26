import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/promos/validate
 * Body: { code: string }
 *
 * Public — used by the booking form to look up a code's discount rate.
 * Returns { valid: boolean, rate?: number, reason?: string }.
 *
 * NOTE: This is read-only. The actual discount apply + uses_count
 * increment happens server-side in /api/create-booking, where we
 * re-validate to avoid race conditions.
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const codeRaw: string | undefined = body?.code;
  if (!codeRaw || !codeRaw.trim()) {
    return NextResponse.json({ valid: false, reason: 'Empty code' });
  }
  const code = codeRaw.trim().toUpperCase();

  const { data, error } = await supabaseAdmin
    .from('promo_codes')
    .select('id, code, discount_rate, max_uses, uses_count, expires_at, active')
    .eq('code', code)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ valid: false, reason: 'Lookup failed' });
  }
  if (!data) {
    return NextResponse.json({ valid: false, reason: 'Code not found' });
  }
  if (!data.active) {
    return NextResponse.json({ valid: false, reason: 'Code is inactive' });
  }
  if (data.expires_at && new Date(data.expires_at) < new Date()) {
    return NextResponse.json({ valid: false, reason: 'Code has expired' });
  }
  if (data.max_uses != null && data.uses_count >= data.max_uses) {
    return NextResponse.json({ valid: false, reason: 'Code has been used up' });
  }

  return NextResponse.json({
    valid: true,
    rate: data.discount_rate,
    code: data.code,
  });
}
