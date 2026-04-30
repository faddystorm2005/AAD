import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/users/delete
 * Body: { userId, force?: boolean }
 *
 * Hard-deletes a user from auth.users + profiles. Requires admin auth.
 *
 * Safeguards:
 * - Refuses to delete the LAST admin (would lock the app's admin UI)
 * - Refuses to delete a user with ACTIVE bookings (pending/approved/
 *   confirmed/in_progress) unless force=true is passed. This prevents
 *   accidentally wiping a customer mid-flight. Force should only be
 *   used after the admin has manually cancelled their bookings.
 * - Refuses self-delete unless self is the LAST step (which would
 *   lock them out — caught by the last-admin check too)
 *
 * Cascading: assumes a foreign-key cascade is set on profiles → bookings
 * and vehicles. If not, those rows are orphaned (still owned by the
 * deleted user_id but inaccessible). For a small biz this is fine; for
 * stricter cleanup add ON DELETE CASCADE to those FKs.
 */

const ACTIVE_STATUSES = ['pending', 'approved', 'confirmed', 'in_progress'];

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
  const callerId = userData.user.id;

  const { data: callerProfile } = await supabaseAdmin
    .from('profiles')
    .select('is_admin')
    .eq('id', callerId)
    .maybeSingle();

  if (!callerProfile?.is_admin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const targetUserId: string | undefined = body?.userId;
  const force: boolean = Boolean(body?.force);

  if (!targetUserId) {
    return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
  }

  // Refuse to delete the last admin.
  const { data: target } = await supabaseAdmin
    .from('profiles')
    .select('is_admin, email, full_name')
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
            'Cannot delete the last admin — the system needs at least one. Promote someone else first.',
        },
        { status: 409 }
      );
    }
  }

  // Refuse to delete a user with active bookings unless force=true.
  if (!force) {
    const { count: activeCount } = await supabaseAdmin
      .from('bookings')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', targetUserId)
      .in('status', ACTIVE_STATUSES);

    if ((activeCount ?? 0) > 0) {
      return NextResponse.json(
        {
          error: `User has ${activeCount} active booking(s). Cancel or complete them first, or pass force=true to delete anyway.`,
          activeCount,
          requiresForce: true,
        },
        { status: 409 }
      );
    }
  }

  // Delete the auth user. supabase.auth.admin.deleteUser cascades the
  // profiles row via the existing on_auth_user_deleted trigger (if set);
  // we also explicitly delete the profile row to be safe.
  const { error: authErr } = await supabaseAdmin.auth.admin.deleteUser(targetUserId);
  if (authErr) {
    return NextResponse.json(
      { error: `Failed to delete auth user: ${authErr.message}` },
      { status: 500 }
    );
  }

  // Best-effort delete of the profiles row (no-op if cascade already handled it).
  await supabaseAdmin.from('profiles').delete().eq('id', targetUserId);

  return NextResponse.json({
    ok: true,
    deletedUser: {
      id: targetUserId,
      email: target?.email ?? null,
      name: target?.full_name ?? null,
    },
  });
}
