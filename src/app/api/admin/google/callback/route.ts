import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { exchangeCodeAndStore } from '@/lib/googleCalendar';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/google/callback?code=...
 *
 * Google redirects here after the admin consents. We must:
 *   1. Identify the current admin user (via Supabase auth cookie OR session)
 *   2. Exchange the `code` for tokens and persist them
 *   3. Redirect back to /admin with a success/error flag
 *
 * Note: Supabase's auth cookies are present because Google's redirect lands
 * on our same origin. We use them to discover which admin is connecting.
 */
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code');
  const error = req.nextUrl.searchParams.get('error');
  const origin = req.nextUrl.origin;

  if (error) {
    return NextResponse.redirect(`${origin}/admin?google=error&reason=${error}`);
  }
  if (!code) {
    return NextResponse.redirect(`${origin}/admin?google=error&reason=no_code`);
  }

  // Find the admin user via cookie-based auth.
  const accessToken = req.cookies.get('sb-access-token')?.value;
  let adminUserId: string | null = null;

  if (accessToken) {
    const userClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { global: { headers: { Authorization: `Bearer ${accessToken}` } } }
    );
    const { data: userData } = await userClient.auth.getUser();
    if (userData?.user) adminUserId = userData.user.id;
  }

  // Fallback: if cookies aren't set (different browsers), use the single
  // admin in the system. Solo-admin site so this is unambiguous.
  if (!adminUserId) {
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('is_admin', true)
      .limit(1)
      .maybeSingle();
    adminUserId = profile?.id ?? null;
  }

  if (!adminUserId) {
    return NextResponse.redirect(`${origin}/admin?google=error&reason=no_admin`);
  }

  // Verify the user we identified actually IS an admin.
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('is_admin')
    .eq('id', adminUserId)
    .maybeSingle();
  if (!profile?.is_admin) {
    return NextResponse.redirect(`${origin}/admin?google=error&reason=forbidden`);
  }

  const redirectUri = `${origin}/api/admin/google/callback`;
  const result = await exchangeCodeAndStore(adminUserId, code, redirectUri);

  if (!result.success) {
    return NextResponse.redirect(
      `${origin}/admin?google=error&reason=${encodeURIComponent(
        result.error || 'unknown'
      )}`
    );
  }

  return NextResponse.redirect(`${origin}/admin?google=connected`);
}
