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
 * There is no admin area on this site. Alex's status is flipped from the Maus
 * & Co. studio panel, so nothing here has to stay reachable to turn it back on.
 */

// Never shown the maintenance page. /maintenance must not rewrite to itself,
// the API keeps serving, and the crawl files stay honest about the site that
// exists.
const ALWAYS_ALLOW = [
  "/maintenance",
  "/api",
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

  const { status, message } = await getSiteStatus("aad");
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
  if (message) headers.set("x-maintenance-message", encodeURIComponent(message));

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
