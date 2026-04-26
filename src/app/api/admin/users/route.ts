import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Admin-only routes for managing users.
 *
 *   GET  /api/admin/users           → list profiles + per-user stats + admin toggle data
 *   POST /api/admin/users           → body: { userId, isAdmin: boolean } — toggle admin
 *
 * Per-user discount and booking history live in sibling routes.
 */

async function requireAdmin(req: NextRequest): Promise<{ userId: string } | NextResponse> {
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

  const { data: userData, error } = await userClient.auth.getUser();
  if (error || !userData?.user) {
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

  return { userId: userData.user.id };
}

interface UserRow {
  id: string;
  email: string | null;
  full_name: string | null;
  phone: string | null;
  is_admin: boolean;
  custom_discount_rate: number;
  discount_single_use: boolean;
  created_at: string;
  booking_count: number;
  total_spent: number;
  last_booking_at: string | null;
}

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (auth instanceof NextResponse) return auth;

  // Profiles — request the discount column too. If it doesn't exist yet
  // (admin hasn't run the SQL), fall back to a query without it.
  let profiles: any[] | null = null;
  let profilesErr: { message: string } | null = null;

  {
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select(
        'id, email, full_name, phone, is_admin, custom_discount_rate, discount_single_use, created_at'
      )
      .order('is_admin', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(500);
    profiles = data;
    profilesErr = error;
  }

  if (profilesErr) {
    // Retry without the new columns — some installs haven't run the migrations.
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select('id, email, full_name, phone, is_admin, created_at')
      .order('is_admin', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(500);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    profiles = (data ?? []).map((p: any) => ({
      ...p,
      custom_discount_rate: 0,
      discount_single_use: false,
    }));
  }

  // Pull bookings to aggregate per-user stats. Filter to non-declined so
  // total_spent reflects real revenue (including in-progress / completed).
  const { data: bookings, error: bookingsErr } = await supabaseAdmin
    .from('bookings')
    .select('user_id, total, status, scheduled_at')
    .neq('status', 'declined');

  if (bookingsErr) {
    return NextResponse.json({ error: bookingsErr.message }, { status: 500 });
  }

  const stats = new Map<string, { count: number; total: number; last: string | null }>();
  for (const b of bookings ?? []) {
    const cur = stats.get(b.user_id) ?? { count: 0, total: 0, last: null };
    cur.count += 1;
    // Only count completed/confirmed bookings toward revenue.
    if (b.status === 'completed' || b.status === 'confirmed' || b.status === 'in_progress') {
      cur.total += Number(b.total) || 0;
    }
    if (!cur.last || b.scheduled_at > cur.last) cur.last = b.scheduled_at;
    stats.set(b.user_id, cur);
  }

  const users: UserRow[] = (profiles ?? []).map((p) => {
    const s = stats.get(p.id);
    return {
      id: p.id,
      email: p.email,
      full_name: p.full_name,
      phone: p.phone,
      is_admin: p.is_admin,
      custom_discount_rate: Number(p.custom_discount_rate) || 0,
      discount_single_use: Boolean(p.discount_single_use),
      created_at: p.created_at,
      booking_count: s?.count ?? 0,
      total_spent: Math.round((s?.total ?? 0) * 100) / 100,
      last_booking_at: s?.last ?? null,
    };
  });

  return NextResponse.json({ users });
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (auth instanceof NextResponse) return auth;

  const body = await req.json().catch(() => null);
  const targetUserId: string | undefined = body?.userId;
  const makeAdmin: boolean = Boolean(body?.isAdmin);

  if (!targetUserId) {
    return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
  }

  if (!makeAdmin) {
    const { data: target } = await supabaseAdmin
      .from('profiles')
      .select('is_admin')
      .eq('id', targetUserId)
      .maybeSingle();

    if (target?.is_admin) {
      const { count } = await supabaseAdmin
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('is_admin', true);
      if ((count ?? 0) <= 1) {
        return NextResponse.json(
          {
            error:
              'Cannot demote the last admin — the system needs at least one. Promote someone else first.',
          },
          { status: 409 }
        );
      }
    }
  }

  const { error } = await supabaseAdmin
    .from('profiles')
    .update({ is_admin: makeAdmin })
    .eq('id', targetUserId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
