import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /auth/callback?code=...&next=/dashboard
 *
 * Handles the redirect Supabase sends after a user clicks the magic link or
 * completes Google OAuth. Exchanges the one-time `code` for a session and
 * forwards them to /dashboard.
 *
 * First-time users (zero vehicles on record) get bounced to
 * /dashboard?firstTime=1 so the dashboard auto-opens the AddVehicleForm.
 *
 * Implementation note: we use the regular supabase-js client to call
 * exchangeCodeForSession. The session cookie itself is then set by the
 * auth state listener on the client side once they land on /dashboard
 * (the AuthProvider's onAuthStateChange picks it up).
 */
export async function GET(req: NextRequest) {
  const url = req.nextUrl;
  const code = url.searchParams.get('code');
  const next = url.searchParams.get('next') ?? '/dashboard';
  const errorParam = url.searchParams.get('error');
  const errorDescription = url.searchParams.get('error_description');
  const origin = url.origin;

  // Surface OAuth-style errors back to the auth page with a friendly message.
  if (errorParam) {
    const reason = errorDescription || errorParam;
    return NextResponse.redirect(
      `${origin}/auth?error=${encodeURIComponent(reason)}`
    );
  }

  if (!code) {
    return NextResponse.redirect(
      `${origin}/auth?error=${encodeURIComponent(
        'Sign-in link is missing or already used. Try again.'
      )}`
    );
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.redirect(
      `${origin}/auth?error=${encodeURIComponent('Server is missing Supabase env vars.')}`
    );
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(
      `${origin}/auth?error=${encodeURIComponent(error.message)}`
    );
  }

  // Detect first-time users by counting their vehicles. Service-role client
  // bypasses RLS since the session cookie isn't set on the server yet.
  // If the count fails for any reason, fall back to the normal /dashboard
  // path - we'd rather not block the redirect on a non-critical check.
  const userId = data.session?.user?.id;
  let destination = next.startsWith('/') ? next : '/dashboard';

  if (userId && destination === '/dashboard') {
    try {
      const { count } = await supabaseAdmin
        .from('vehicles')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId);
      if ((count ?? 0) === 0) {
        destination = '/dashboard?firstTime=1';
      }
    } catch {
      // Ignore - fall through to /dashboard.
    }
  }

  return NextResponse.redirect(`${origin}${destination}`);
}
