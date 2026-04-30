import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /auth/callback?code=...&next=/dashboard
 *
 * Handles the redirect Supabase sends after a user clicks the email
 * confirmation link. Exchanges the one-time `code` for a session and
 * forwards them to /dashboard (or wherever `next` says).
 *
 * Without this route the email link 404s and the user sees a white
 * "can't load this page" — that's the bug we're fixing.
 *
 * Implementation note: we use the regular supabase-js client to call
 * exchangeCodeForSession. The session cookie itself is then set by the
 * auth state listener on the client side once they land on /dashboard
 * (the AuthProvider's onAuthStateChange picks it up). This works because
 * exchangeCodeForSession returns a session that the client can then
 * persist to localStorage on next page load.
 *
 * For email-link flows that include the session in the URL fragment
 * (Supabase's older "implicit" flow), the @supabase/supabase-js client
 * picks them up automatically via detectSessionInUrl — those don't even
 * route through here. This handler is the safety net for the PKCE-style
 * `?code=` confirmation links.
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
    // No code AND no error means the link was malformed or already used.
    return NextResponse.redirect(
      `${origin}/auth?error=${encodeURIComponent(
        'Confirmation link is missing or already used. Try signing in.'
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
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(
      `${origin}/auth?error=${encodeURIComponent(error.message)}`
    );
  }

  // Send them in. The client-side AuthProvider will pick up the new
  // session via onAuthStateChange when /dashboard mounts.
  return NextResponse.redirect(`${origin}${next.startsWith('/') ? next : '/dashboard'}`);
}
