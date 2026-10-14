/**
 * Whether a site is showing its real pages or a maintenance notice.
 *
 * Read by middleware on every request that is not excluded, so the two things
 * that matter are that it is cheap and that it cannot take the site down.
 *
 * FAIL OPEN, always. A timeout, a non-200, malformed JSON, a value that is not
 * one of the two we know, Supabase being down, the env vars being missing:
 * every one of those returns "live". The worst outcome of a bug here is a
 * maintenance page nobody can lift, on a site whose admin panel sits behind
 * the same middleware. Serving the real site while the status service is down
 * is strictly better than the reverse.
 *
 * No "server-only" import: middleware bundles this, and it holds no secret.
 * The anon key it uses is public by design and the view is read-only to it
 * (see supabase/public-views-readonly.sql in maus-and-co).
 *
 * WHERE IT READS. The switch lives in the Maus & Co. Supabase project, not in
 * this site's own. Until 2026-10-14 this file read NEXT_PUBLIC_SUPABASE_URL,
 * which on this site is Signature's own booking database. None of the SQL in
 * this repo creates site_status_public there, so as far as the repo shows,
 * every read failed open and flipping the switch on the studio panel did
 * nothing here. It now reads three settings of
 * its own, all server side, so the booking database is never pointed at
 * Maus's project and Maus's project is never pointed at the bookings:
 *
 *   MAUS_STATUS_URL       the maus-and-co project URL
 *   MAUS_STATUS_ANON_KEY  the maus-and-co anon key (public, read-only views)
 *   MAUS_SITE_SLUG        "aad"
 *
 * Any of the three missing means live. MAUS_SITE_SLUG matters most: the
 * aad-command-center Vercel project builds from this same repo, and without
 * the slug it can never be taken down by Signature's switch.
 */

export type SiteStatus = {
  status: "live" | "maintenance";
  message: string | null;
};

export const LIVE: SiteStatus = { status: "live", message: null };

/**
 * This deployment's slug, from MAUS_SITE_SLUG, or null when it is not set.
 * Exact match only: "AAD" or " aad" is not a slug, so it is live.
 */
export function siteSlug(): string | null {
  const slug = process.env.MAUS_SITE_SLUG;
  return slug && KNOWN_SLUGS.has(slug) ? slug : null;
}

// One warning per isolate when the read fails, never one per request.
let warned = false;
function warnOnce(reason: string) {
  if (warned) return;
  warned = true;
  console.warn(`[site-status] could not read the switch (${reason}); serving the site`);
}

// Long enough to survive a slow cold read, short enough that it never becomes
// the reason a page is slow.
const TIMEOUT_MS = 2000;

// How long a fetched value is served. Past this the next request reads again
// and waits for the answer; nothing is ever refreshed behind a response.
//
// Until 2026-10-14 a stale value was handed back and refreshed in the
// background. Vercel only promises to finish middleware work handed to
// waitUntil, so a refresh cut off after the response left an isolate on its
// old answer. In Troy's live test of Thrive 65, which runs this same reader,
// that answer was "live": / showed the notice while /about served the real
// page throughout.
const TTL_MS = 20_000;

// How long a request waits for a read before serving the site. A little over
// TIMEOUT_MS, because that timeout lives inside a fetch the edge may never
// finish, and a request must never wait on a dead one.
const WAIT_MS = TIMEOUT_MS + 500;

// Only the sites that exist. Phase 2 wires the client sites up and the obvious
// way to pick a slug is from the Host header, which a stranger controls. Left
// open, that makes `memo` an unbounded map keyed on attacker input inside a
// long-lived isolate, and every unknown host a fresh 2 second round trip.
// Only this site. The switch here answers for aad and nothing else.
const KNOWN_SLUGS = new Set(["aad"]);

/**
 * Middleware does NOT participate in the Next.js data cache, so `next:
 * { revalidate }` on the fetch would be quietly ignored and every request
 * would hit Supabase. This memo lives in the module scope of the edge isolate,
 * which is reused across requests, and is what actually makes the read cheap.
 */
type Entry = { value: SiteStatus; at: number };
const memo = new Map<string, Entry>();
type Pending = { p: Promise<SiteStatus>; at: number };
const inFlight = new Map<string, Pending>();

async function fetchStatus(slug: string): Promise<SiteStatus> {
  const url = process.env.MAUS_STATUS_URL;
  const key = process.env.MAUS_STATUS_ANON_KEY;
  // Not configured is not a failure: say nothing, serve the site.
  if (!url || !key) return LIVE;

  const endpoint =
    `${url}/rest/v1/site_status_public` +
    `?slug=eq.${encodeURIComponent(slug)}&select=site_status,status_message&limit=1`;

  try {
    const res = await fetch(endpoint, {
      headers: { apikey: key, authorization: `Bearer ${key}` },
      // AbortSignal.timeout rather than a manual controller: on the edge a
      // dangling setTimeout can outlive the request.
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: "no-store",
    });
    if (!res.ok) {
      warnOnce(`HTTP ${res.status}`);
      return LIVE;
    }

    const rows: unknown = await res.json();
    if (!Array.isArray(rows)) {
      warnOnce("not a list");
      return LIVE;
    }
    if (rows.length === 0) return LIVE;

    const row = rows[0] as { site_status?: unknown; status_message?: unknown };
    // Anything other than the exact string "maintenance" is live. A typo, a
    // null, a value someone adds later without reading this file: all of them
    // leave the site up.
    if (row.site_status !== "maintenance") return LIVE;

    const message =
      typeof row.status_message === "string" && row.status_message.trim()
        ? row.status_message.trim()
        : null;
    return { status: "maintenance", message };
  } catch (e) {
    warnOnce(e instanceof Error ? e.name : "error");
    return LIVE;
  }
}

function refresh(slug: string): Promise<SiteStatus> {
  const existing = inFlight.get(slug);
  // A read older than WAIT_MS was cut off, not slowed down: its own timeout
  // would have settled it by now. Start a fresh one rather than queue on it.
  if (existing && Date.now() - existing.at <= WAIT_MS) return existing.p;
  const p: Promise<SiteStatus> = fetchStatus(slug)
    .then((value) => {
      // A read that was given up on and settles late must not overwrite a
      // newer answer.
      if (inFlight.get(slug)?.p === p) memo.set(slug, { value, at: Date.now() });
      return value;
    })
    .catch(() => LIVE)
    .finally(() => {
      if (inFlight.get(slug)?.p === p) inFlight.delete(slug);
    });
  inFlight.set(slug, { p, at: Date.now() });
  return p;
}

export async function getSiteStatus(slug: string): Promise<SiteStatus> {
  if (!KNOWN_SLUGS.has(slug)) return LIVE;

  const hit = memo.get(slug);
  if (hit && Date.now() - hit.at <= TTL_MS) return hit.value;

  // Cold or stale: this request waits for a fresh read, at most WAIT_MS, and
  // serves the site if no answer comes. A request that is awaiting the read
  // cannot have it dropped. One request per isolate every 20 seconds pays for
  // the read; the rest are answered from memory.
  let timer: ReturnType<typeof setTimeout> | undefined;
  const gaveUp = new Promise<SiteStatus>((resolve) => {
    timer = setTimeout(() => {
      warnOnce("no answer");
      resolve(LIVE);
    }, WAIT_MS);
  });
  try {
    return await Promise.race([refresh(slug), gaveUp]);
  } finally {
    clearTimeout(timer);
  }
}

/** Test seam, so the cache behaviour can be asserted rather than assumed. */
export function __resetSiteStatusCache() {
  memo.clear();
  inFlight.clear();
}
