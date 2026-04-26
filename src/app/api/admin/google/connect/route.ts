import { NextRequest, NextResponse } from 'next/server';
import { GOOGLE_SCOPES } from '@/lib/googleCalendar';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/google/connect
 *
 * Kicks off the OAuth flow. The admin clicks the Connect button, which hits
 * this endpoint, which 302s to Google's consent screen with our client ID
 * and scopes. After consent, Google redirects to /api/admin/google/callback.
 *
 * Auth: this endpoint itself is not protected (the redirect is harmless),
 * but the callback validates the admin via session before storing tokens.
 */
export async function GET(req: NextRequest) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const origin = req.nextUrl.origin;
  if (!clientId) {
    return NextResponse.redirect(
      `${origin}/admin?google=error&reason=server_not_configured`
    );
  }
  const redirectUri = `${origin}/api/admin/google/callback`;

  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', GOOGLE_SCOPES);
  url.searchParams.set('access_type', 'offline'); // gets refresh_token
  url.searchParams.set('prompt', 'consent'); // force refresh_token issuance
  url.searchParams.set('include_granted_scopes', 'true');

  return NextResponse.redirect(url.toString());
}
