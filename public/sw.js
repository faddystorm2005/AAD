/* Signature Mobile Detailing service worker - offline support + web push notifications.
 *
 * BUMP THE VERSION every time you ship code that needs all clients to refresh.
 * The activate handler purges any cache that doesn't match the new version
 * names, so every visitor gets a clean slate on their next page load.
 *
 * v1 -> v2: force-flush stale bundles after Cancel/Reschedule/Delete shipped.
 * v5 -> v6: add push notification handlers for admin + customer alerts.
 * v7 -> v8: review-request cron + admin/homepage refresh shipped.
 * v8 -> v9: 7-day follow-up pass added to review-request cron.
 * v9 -> v10: stop intercepting video requests. Videos stream with Range
 *            (partial 206) responses, which cache.put() rejects, so the
 *            old networkFirst path stalled playback (infinite spinner,
 *            tap-to-play flakiness). The browser now streams video natively.
 * v20 -> v22: the maintenance switch shipped. v21 is skipped on purpose: it is
 *            already used by the unreleased cms-content-round2 branch, and two
 *            builds sharing a cache namespace means neither purges the other.
 *            A maintenance 503, identified by the x-maintenance header the
 *            proxy sets, now purges the whole runtime cache once, so a visitor
 *            who goes offline mid-outage is not shown a cached copy of a site
 *            that is actually down. Only the runtime cache: cacheFirst serves
 *            /_next/static/, which the proxy never intercepts, and images
 *            going stale during an outage harms nobody.
 */
const VERSION = "aad-v22";
const STATIC_CACHE = `${VERSION}-static`;
const RUNTIME_CACHE = `${VERSION}-runtime`;
const OFFLINE_URL = "/offline.html";

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(STATIC_CACHE);
      await cache.add(new Request(OFFLINE_URL, { cache: "reload" }));
      self.skipWaiting();
    })()
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((k) => k !== STATIC_CACHE && k !== RUNTIME_CACHE)
          .map((k) => caches.delete(k))
      );
      await self.clients.claim();
    })()
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;

  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Never cache Next.js dev/HMR or API routes - they must always hit the network.
  if (
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/_next/webpack-hmr") ||
    url.pathname.startsWith("/_next/static/development/")
  ) {
    return;
  }

  // Videos stream via Range requests; the Cache API cannot store partial
  // (206) responses, so intercepting them stalls playback. Let the browser
  // handle video natively.
  if (req.destination === "video" || url.pathname.endsWith(".mp4")) {
    return;
  }

  // Cache-first for immutable Next.js build assets.
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(cacheFirst(req));
    return;
  }

  // Stale-while-revalidate for images.
  if (req.destination === "image") {
    event.respondWith(staleWhileRevalidate(req));
    return;
  }

  // Network-first for everything else (HTML, JSON, fonts), with offline fallback for navigations.
  if (req.mode === "navigate") {
    event.respondWith(networkFirstPage(req));
    return;
  }

  event.respondWith(networkFirst(req));
});

/**
 * Throw away the whole runtime cache the first time we see a deliberate
 * outage.
 *
 * Two things were wrong with deleting only the requested URL. It cleared one
 * page and left every other warm page intact, so a visitor who then lost
 * signal still got the real site with a booking button on it. And it could not
 * reach the entries Next's own link prefetching creates: those are keyed by
 * the rsc header through Vary, so a navigation-shaped delete never matched
 * them and a soft navigation replayed the stale page anyway.
 *
 * One 503 is proof the whole origin is down, not just that URL, so the whole
 * runtime cache goes.
 *
 * Gated on the header the proxy sets, NOT on the bare status. Vercel returns
 * 503 under load too, and destroying someone's offline copy of the site
 * because of a bad ten minutes is a worse trade than leaving it: offline.html
 * has no phone number on it, so the fallback would be a dead end on a site
 * whose only job is to make the phone ring.
 */
let purged = false;
async function purgeIfMaintenance(res) {
  if (purged) return;
  if (res.status !== 503 || res.headers.get("x-maintenance") !== "1") return;
  purged = true;
  await caches.delete(RUNTIME_CACHE);
}

async function cacheFirst(req) {
  const cache = await caches.open(STATIC_CACHE);
  const hit = await cache.match(req);
  if (hit) return hit;
  const res = await fetch(req);
  if (res.ok) cache.put(req, res.clone());
  return res;
}

async function staleWhileRevalidate(req) {
  const cache = await caches.open(RUNTIME_CACHE);
  const hit = await cache.match(req);
  const fetchPromise = fetch(req)
    .then((res) => {
      if (res.ok) cache.put(req, res.clone());
      return res;
    })
    .catch(() => hit);
  return hit || fetchPromise;
}

async function networkFirst(req) {
  const cache = await caches.open(RUNTIME_CACHE);
  try {
    const res = await fetch(req);
    if (res.ok) cache.put(req, res.clone());
    else await purgeIfMaintenance(res);
    return res;
  } catch (err) {
    const hit = await cache.match(req);
    if (hit) return hit;
    throw err;
  }
}

async function networkFirstPage(req) {
  const cache = await caches.open(RUNTIME_CACHE);
  try {
    const res = await fetch(req);
    if (res.ok) cache.put(req, res.clone());
    else await purgeIfMaintenance(res);
    return res;
  } catch (err) {
    const hit = await cache.match(req);
    if (hit) return hit;
    const offline = await caches.match(OFFLINE_URL);
    return offline || Response.error();
  }
}

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: "Signature Mobile Detailing", body: event.data ? event.data.text() : "" };
  }

  const title = data.title || "Signature Mobile Detailing";
  const options = {
    body: data.body || "",
    icon: "/apple-touch-icon.png",
    badge: "/apple-touch-icon.png",
    data: { url: data.url || "/" },
    tag: data.tag || "aad-notification",
    requireInteraction: false,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url === url && "focus" in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});
