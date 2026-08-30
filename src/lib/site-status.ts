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
 * (see supabase/public-views-readonly.sql).
 */

export type SiteStatus = {
  status: "live" | "maintenance";
  message: string | null;
};

export const LIVE: SiteStatus = { status: "live", message: null };

// Long enough to survive a slow cold read, short enough that it never becomes
// the reason a page is slow.
const TIMEOUT_MS = 2000;

// How long a fetched value is served before a refresh is kicked off.
const TTL_MS = 20_000;

// Absolute ceiling on how long a remembered value may be served. The refresh
// runs detached from the response, and the edge is not obliged to finish work
// that nothing is awaiting. If one is dropped rather than rejected, `inFlight`
// keeps an unsettled promise, every later refresh returns that dead promise,
// and the entry never updates again. Serving a stale "maintenance" forever is
// the exact failure this file exists to prevent, so past this age the answer
// is live regardless of what is remembered.
const HARD_MAX_MS = 5 * 60_000;

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
const inFlight = new Map<string, Promise<SiteStatus>>();

async function fetchStatus(slug: string): Promise<SiteStatus> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
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
    if (!res.ok) return LIVE;

    const rows: unknown = await res.json();
    if (!Array.isArray(rows) || rows.length === 0) return LIVE;

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
  } catch {
    return LIVE;
  }
}

function refresh(slug: string): Promise<SiteStatus> {
  const existing = inFlight.get(slug);
  if (existing) return existing;
  const p = fetchStatus(slug)
    .then((value) => {
      memo.set(slug, { value, at: Date.now() });
      return value;
    })
    .catch(() => LIVE)
    .finally(() => inFlight.delete(slug));
  inFlight.set(slug, p);
  return p;
}

export async function getSiteStatus(slug: string): Promise<SiteStatus> {
  if (!KNOWN_SLUGS.has(slug)) return LIVE;

  const hit = memo.get(slug);

  if (hit) {
    const age = Date.now() - hit.at;
    // Too old to trust. See HARD_MAX_MS.
    if (age > HARD_MAX_MS) {
      memo.delete(slug);
      void refresh(slug);
      return LIVE;
    }
    // Stale: hand back what we have and refresh behind the request, so a
    // visitor never waits on Supabase once the isolate is warm.
    if (age > TTL_MS) void refresh(slug);
    return hit.value;
  }

  // Cold isolate: this one request waits, bounded by the timeout above and
  // failing open if it expires.
  return refresh(slug);
}

/** Test seam, so the cache behaviour can be asserted rather than assumed. */
export function __resetSiteStatusCache() {
  memo.clear();
  inFlight.clear();
}
