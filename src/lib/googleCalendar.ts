/**
 * Google Calendar push integration for the admin user.
 *
 * Tokens are stored on the admin's `profiles` row. Every time we need to call
 * the Calendar API we check whether the access token is fresh; if not we use
 * the long-lived refresh token to mint a new one and persist it.
 *
 * Required Supabase profile columns (one-time setup, see SETUP.md):
 *   google_access_token      TEXT
 *   google_refresh_token     TEXT
 *   google_token_expires_at  TIMESTAMPTZ
 *   google_calendar_id       TEXT
 *
 * Required bookings column:
 *   google_event_id          TEXT
 */

import { supabaseAdmin } from './supabaseAdmin';
import { ADD_ONS, isCeramicSelected } from './bookingPricing';

const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_API = 'https://www.googleapis.com/calendar/v3';

export const GOOGLE_SCOPES = [
  'https://www.googleapis.com/auth/calendar.events',
  // calendarlist.readonly lets the user pick which calendar to write to.
  'https://www.googleapis.com/auth/calendar.calendarlist.readonly',
].join(' ');

interface AdminTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: string; // ISO timestamp
  calendarId: string | null;
}

/** Returns null when the admin hasn't connected Google Calendar yet. */
export async function getAdminTokens(adminUserId: string): Promise<AdminTokens | null> {
  const { data } = await supabaseAdmin
    .from('profiles')
    .select(
      'google_access_token, google_refresh_token, google_token_expires_at, google_calendar_id'
    )
    .eq('id', adminUserId)
    .maybeSingle();
  if (!data?.google_access_token || !data.google_refresh_token) return null;
  return {
    accessToken: data.google_access_token,
    refreshToken: data.google_refresh_token,
    expiresAt: data.google_token_expires_at,
    calendarId: data.google_calendar_id,
  };
}

/**
 * Get a fresh access token. If the cached one is within 60s of expiring (or
 * already expired), refresh via the refresh token and persist the new one.
 */
async function getFreshAccessToken(adminUserId: string): Promise<string | null> {
  const tokens = await getAdminTokens(adminUserId);
  if (!tokens) return null;

  const expiresAt = new Date(tokens.expiresAt).getTime();
  if (expiresAt - Date.now() > 60_000) {
    return tokens.accessToken;
  }

  // Refresh.
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    console.error('[google] missing GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET');
    return null;
  }

  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: tokens.refreshToken,
      grant_type: 'refresh_token',
    }),
  });

  if (!res.ok) {
    console.error('[google] refresh failed', res.status, await res.text());
    return null;
  }

  const json = (await res.json()) as { access_token: string; expires_in: number };
  const newExpiresAt = new Date(Date.now() + json.expires_in * 1000).toISOString();

  await supabaseAdmin
    .from('profiles')
    .update({
      google_access_token: json.access_token,
      google_token_expires_at: newExpiresAt,
    })
    .eq('id', adminUserId);

  return json.access_token;
}

/**
 * Exchange an OAuth `code` for tokens and persist them on the admin's profile.
 * Returns true on success.
 */
export async function exchangeCodeAndStore(
  adminUserId: string,
  code: string,
  redirectUri: string
): Promise<{ success: boolean; error?: string }> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return { success: false, error: 'Server is missing Google OAuth env vars.' };
  }

  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri,
    }),
  });

  if (!res.ok) {
    return { success: false, error: `Google token exchange failed: ${await res.text()}` };
  }

  const json = (await res.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in: number;
  };

  // Google only returns a refresh_token on the FIRST consent. Re-using a
  // connection without revoking gives an empty refresh_token. We require it
  // — tell the caller to disconnect and reconnect with prompt=consent.
  if (!json.refresh_token) {
    return {
      success: false,
      error:
        'No refresh token returned. Disconnect first (or revoke access in your Google account) then try again.',
    };
  }

  const expiresAt = new Date(Date.now() + json.expires_in * 1000).toISOString();
  await supabaseAdmin
    .from('profiles')
    .update({
      google_access_token: json.access_token,
      google_refresh_token: json.refresh_token,
      google_token_expires_at: expiresAt,
      google_calendar_id: 'primary', // default to user's primary calendar
    })
    .eq('id', adminUserId);

  return { success: true };
}

export async function disconnectGoogle(adminUserId: string): Promise<void> {
  const tokens = await getAdminTokens(adminUserId);
  if (tokens?.refreshToken) {
    // Best-effort revoke. Ignore errors — we'll clear our copy regardless.
    fetch(`https://oauth2.googleapis.com/revoke?token=${tokens.refreshToken}`, {
      method: 'POST',
    }).catch(() => {});
  }
  await supabaseAdmin
    .from('profiles')
    .update({
      google_access_token: null,
      google_refresh_token: null,
      google_token_expires_at: null,
      google_calendar_id: null,
    })
    .eq('id', adminUserId);
}

// ─────────── Event upsert / delete ───────────

interface BookingForGoogle {
  id: string;
  service: string;
  scheduled_at: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  status: string;
  addons: string[] | null;
  google_event_id: string | null;
  customer?: { full_name: string | null; phone: string | null } | null;
  vehicle?: {
    year: number;
    make: string;
    model: string;
    nickname: string | null;
  } | null;
}

function buildEventBody(b: BookingForGoogle) {
  const ceramic = isCeramicSelected(b.addons);
  const start = new Date(b.scheduled_at);
  const end = new Date(start.getTime() + (ceramic ? 8 : 3) * 60 * 60 * 1000);

  const customer = b.customer?.full_name || 'Customer';
  const v = b.vehicle;
  const vehicleStr = v
    ? `${v.year} ${v.make} ${v.model}${v.nickname ? ` "${v.nickname}"` : ''}`
    : 'Vehicle';
  const addonNames =
    (b.addons ?? [])
      .map((id) => ADD_ONS.find((a) => a.id === id)?.name ?? id)
      .join(', ') || 'None';
  const phone = b.customer?.phone ? `\nPhone: ${b.customer.phone}` : '';

  return {
    summary: `${b.service} – ${customer}`,
    location: `${b.address}, ${b.city}, ${b.state} ${b.zip}`,
    description:
      `${b.service} – ${customer}${phone}\n` +
      `Vehicle: ${vehicleStr}\n` +
      `Add-ons: ${addonNames}\n` +
      `Status: ${b.status}\n\n` +
      `Booking ID: ${b.id}`,
    start: { dateTime: start.toISOString(), timeZone: 'America/Chicago' },
    end: { dateTime: end.toISOString(), timeZone: 'America/Chicago' },
    status:
      b.status === 'pending' || b.status === 'approved'
        ? 'tentative'
        : 'confirmed',
  };
}

/**
 * Push a booking to the admin's Google Calendar. Creates the event if
 * `google_event_id` is null, otherwise updates the existing event. Stores
 * the resulting event ID on the booking row.
 *
 * Best-effort — never throws. Logs and moves on if Google is unreachable.
 */
export async function pushBookingToGoogle(
  adminUserId: string,
  bookingId: string
): Promise<void> {
  // Hard short-circuit: if Google OAuth isn't configured at the platform level,
  // skip everything — no DB queries, no logs. Lets the integration ship before
  // the operator has done the Google Cloud setup.
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) return;
  try {
    const accessToken = await getFreshAccessToken(adminUserId);
    if (!accessToken) return; // not connected

    const tokens = await getAdminTokens(adminUserId);
    const calendarId = tokens?.calendarId || 'primary';

    const { data: booking } = await supabaseAdmin
      .from('bookings')
      .select(
        `id, service, scheduled_at, address, city, state, zip, status, addons,
         google_event_id,
         customer:profiles!user_id(full_name, phone),
         vehicle:vehicles!vehicle_id(year, make, model, nickname)`
      )
      .eq('id', bookingId)
      .maybeSingle();

    if (!booking) return;
    const b = booking as unknown as BookingForGoogle;
    const body = buildEventBody(b);

    const eventId = b.google_event_id;
    const url = eventId
      ? `${GOOGLE_API}/calendars/${encodeURIComponent(calendarId)}/events/${eventId}`
      : `${GOOGLE_API}/calendars/${encodeURIComponent(calendarId)}/events`;
    const method = eventId ? 'PATCH' : 'POST';

    const res = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      console.error(
        '[google] push failed',
        res.status,
        (await res.text()).slice(0, 200)
      );
      return;
    }

    if (!eventId) {
      const json = (await res.json()) as { id: string };
      await supabaseAdmin
        .from('bookings')
        .update({ google_event_id: json.id })
        .eq('id', bookingId);
    }
  } catch (err) {
    console.error('[google] push exception', err);
  }
}

/** Best-effort delete. Idempotent. */
export async function deleteBookingFromGoogle(
  adminUserId: string,
  bookingId: string
): Promise<void> {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) return;
  try {
    const accessToken = await getFreshAccessToken(adminUserId);
    if (!accessToken) return;

    const tokens = await getAdminTokens(adminUserId);
    const calendarId = tokens?.calendarId || 'primary';

    const { data: booking } = await supabaseAdmin
      .from('bookings')
      .select('google_event_id')
      .eq('id', bookingId)
      .maybeSingle();

    const eventId = booking?.google_event_id;
    if (!eventId) return;

    await fetch(
      `${GOOGLE_API}/calendars/${encodeURIComponent(calendarId)}/events/${eventId}`,
      { method: 'DELETE', headers: { Authorization: `Bearer ${accessToken}` } }
    );

    await supabaseAdmin
      .from('bookings')
      .update({ google_event_id: null })
      .eq('id', bookingId);
  } catch (err) {
    console.error('[google] delete exception', err);
  }
}

/**
 * Find the single admin user (the one with is_admin=true). For a solo-admin
 * site this is enough; for multi-admin you'd need per-booking attribution.
 */
export async function findAdminUserId(): Promise<string | null> {
  const { data } = await supabaseAdmin
    .from('profiles')
    .select('id')
    .eq('is_admin', true)
    .limit(1)
    .maybeSingle();
  return data?.id ?? null;
}
