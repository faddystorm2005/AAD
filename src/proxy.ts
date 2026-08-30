import { NextResponse, type NextRequest } from "next/server";
import { getSiteStatus } from "@/lib/site-status";

/**
 * The kill switch for signaturemobiledetailaz.com.
 *
 * Ported from mausandco.com, where it runs in production, and from
 * thrive-65.com. This is Next 16, so the file is proxy.ts rather than
 * middleware.ts, and it lives under src/ because the app does.
 *
 * When portal_sites.site_status is 'maintenance' for slug 'aad', every public
 * page is rewritten to /maintenance and answered 503 with Retry-After, so the
 * address the visitor typed stays in the bar and search engines treat the
 * outage as temporary rather than dropping the page.
 *
 * FAIL OPEN. getSiteStatus returns "live" for every failure mode: a timeout, a
 * non-200, malformed JSON, an unexpected value, missing environment variables.
 * Nothing here should add a way to fail closed. Alex's phone stops ringing if
 * this site goes dark by accident, so a maintenance page nobody asked for is
 * the expensive failure, not a site that stays up while the status read is
 * broken.
 *
 * Alex's status is flipped from the Maus & Co. studio panel, so nothing on
 * this domain has to stay reachable to turn the site back on. The owners'
 * console at /admin is exempted anyway: they still need to see today's jobs
 * while the public site is down. An earlier version of this comment claimed
 * this site had no admin area, which was simply wrong, and the console was
 * being answered 503 along with everything else.
 */

// Never shown the maintenance page. /maintenance must not rewrite to itself,
// the API keeps serving, and the crawl files stay honest about the site that
// exists.
const ALWAYS_ALLOW = [
  "/maintenance",
  "/api",
  // The owners' booking console, and the sign-in flow it depends on. Alex and
  // Kane still need to see today's jobs while the public site is down, and an
  // OAuth callback answered 503 strands them mid sign-in.
  "/admin",
  "/auth",
  "/dashboard",
  "/settings",
  // A customer who already booked can still pull up their own confirmation.
  "/booking-confirmation",
  // Metadata routes are generated and have no file extension, so the matcher
  // does not skip them. Without these the maintenance page loses its own
  // favicon and a shared link shows a broken preview.
  "/icon",
  "/icon1",
  "/apple-icon",
  "/opengraph-image",
  "/twitter-image",
  "/.well-known",
  "/robots.txt",
  "/sitemap.xml",
  "/manifest.webmanifest",
  "/favicon.ico",
  "/images",
  "/icons",
  // The service worker and its offline page must always come from the network.
  // If the worker script itself were rewritten to a 503 the browser would keep
  // running the old one, which is the opposite of what a version bump is for.
  "/sw.js",
  "/offline.html",
];

function matches(pathname: string, prefixes: string[]) {
  return prefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // x-maintenance and x-maintenance-message are a private channel from this
  // file to the app. Anyone can put those names on a request, so they are
  // stripped on the way in, on every path, before anything downstream reads
  // them.
  const headers = new Headers(request.headers);
  headers.delete("x-maintenance");
  headers.delete("x-maintenance-message");
  const passThrough = () => NextResponse.next({ request: { headers } });

  if (matches(pathname, ALWAYS_ALLOW)) return passThrough();

  let status: string;
  let message: string | null;
  try {
    ({ status, message } = await getSiteStatus("aad"));
  } catch {
    // Nothing below this line is allowed to take the site down. site-status is
    // written not to throw, but the guarantee has to be structural rather than
    // a promise one file makes to another.
    return passThrough();
  }
  if (status !== "maintenance") return passThrough();

  const url = request.nextUrl.clone();
  url.pathname = "/maintenance";

  // The page is a server component and cannot see proxy state, so the note
  // rides along on a request header rather than the URL, which has to keep
  // showing the page the visitor actually asked for.
  // Set unconditionally so /maintenance can require it and refuse a direct
  // visit, which otherwise lets anyone link the domain as proof Signature is
  // offline.
  headers.set("x-maintenance", "1");
  if (message) {
    try {
      // Capped before encoding. This is free text from a panel, encoding can
      // triple its length on emoji, and it travels as a request header with a
      // hard size limit. Also: encodeURIComponent throws on an unpaired
      // surrogate, so the whole thing sits in a try.
      headers.set(
        "x-maintenance-message",
        encodeURIComponent(message.slice(0, 300))
      );
    } catch {
      // The page has a plain fallback. A bad message costs the note, not the
      // page.
    }
  }

  // 503 with Retry-After is the pair that tells a crawler to come back rather
  // than drop the page. Ten minutes, not an hour: Next adds its own noindex to
  // any non-200 render and, because this is a rewrite, that lands on the real
  // URL, so the recrawl should follow the recovery closely.
  return NextResponse.rewrite(url, {
    request: { headers },
    status: 503,
    headers: {
      "Retry-After": "600",
      "Cache-Control": "no-store, must-revalidate",
      // Read by public/sw.js. A 503 on its own could be Vercel under load, and
      // the worker must not purge a visitor's offline copy for that. This says
      // the outage is deliberate.
      "x-maintenance": "1",
    },
  });
}

export const config = {
  // Everything except Next internals and files with an extension, so static
  // assets never pay for the check. ALWAYS_ALLOW above is the real guard: the
  // escaping in this pattern is easy to get wrong, and when it was wrong on
  // the studio site every file in /public answered the maintenance page.
  matcher: ["/((?!_next/static|_next/image|.*\\.[\\w]+$).*)"],
};
