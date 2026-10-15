// Proves the Maus & Co. kill switch on this site fails open and only ever
// takes down the public pages.
//
//   npm run test:kill-switch            unit cases against src/lib/site-status.ts
//   npm run test:kill-switch -- --e2e   also runs `next start` against a stub
//                                       status server (needs `npm run build`)
//   npm run test:kill-switch:selftest   the same unit cases against a broken
//                                       copy of the file; it MUST go red
//
// No .env is read or written. The settings are passed to the child process
// inline and point at a stub on 127.0.0.1.

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import http from "node:http";
import { spawn, execSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const BROKEN = process.argv.includes("--broken");
const E2E = process.argv.includes("--e2e");

let failed = 0;
let passed = 0;
function check(name, ok, detail = "") {
  if (ok) {
    passed++;
    console.log(`  ok    ${name}`);
  } else {
    failed++;
    console.log(`  FAIL  ${name}${detail ? `  (${detail})` : ""}`);
  }
}

// --- load the module (or a broken copy of it) -----------------------------

const srcPath = path.join(root, "src/lib/site-status.ts");
let modPath = srcPath;
if (BROKEN) {
  // Two mutations, each the shape of a real mistake: reading any value as
  // maintenance (fail closed), and matching the slug without caring about case.
  let src = fs.readFileSync(srcPath, "utf8");
  const a = `if (row.site_status !== "maintenance") return LIVE;`;
  const b = `return slug && KNOWN_SLUGS.has(slug) ? slug : null;`;
  if (!src.includes(a) || !src.includes(b)) {
    console.log("SELFTEST COULD NOT RUN: mutation anchors not found");
    process.exit(2);
  }
  src = src
    .replace(a, `if (row.site_status == null) return LIVE;`)
    .replace(
      b,
      `return slug && KNOWN_SLUGS.has(slug.trim().toLowerCase()) ? slug.trim().toLowerCase() : null;`
    );
  modPath = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "aad-ks-")), "site-status.ts");
  fs.writeFileSync(modPath, src);
}
const m = await import(pathToFileURL(modPath).href);

// --- a controllable fetch --------------------------------------------------

let calls = [];
let respond = () => new Response("[]", { status: 200 });
const realFetch = globalThis.fetch;
globalThis.fetch = async (url, init) => {
  calls.push({ url: String(url), init });
  return respond(init);
};
const json =
  (body, status = 200) =>
  () =>
    new Response(typeof body === "string" ? body : JSON.stringify(body), { status });
const warns = [];
console.warn = (...a) => warns.push(a.join(" "));

const STATUS_URL = "https://status.example.test";
const KEYS = ["MAUS_STATUS_URL", "MAUS_STATUS_ANON_KEY", "MAUS_SITE_SLUG"];
function env(over) {
  for (const k of KEYS) delete process.env[k];
  for (const [k, v] of Object.entries(over)) if (v !== undefined) process.env[k] = v;
}
const FULL = {
  MAUS_STATUS_URL: STATUS_URL,
  MAUS_STATUS_ANON_KEY: "anon-placeholder",
  MAUS_SITE_SLUG: "aad",
};

async function read(over, responder) {
  env(over);
  m.__resetSiteStatusCache();
  calls = [];
  respond = responder;
  const slug = m.siteSlug();
  const value = slug ? await m.getSiteStatus(slug) : m.LIVE;
  return { slug, value, calls: calls.length };
}

console.log(BROKEN ? "\nkill switch selftest (broken copy, must fail)\n" : "\nkill switch, unit\n");

console.log("1. which deployment has a switch at all");
{
  env({});
  check("MAUS_SITE_SLUG unset: no slug", m.siteSlug() === null);
  env({ MAUS_SITE_SLUG: "AAD" });
  check('"AAD" is not the slug', m.siteSlug() === null);
  env({ MAUS_SITE_SLUG: " aad" });
  check('" aad" is not the slug', m.siteSlug() === null);
  env({ MAUS_SITE_SLUG: "sahara" });
  check("another site's slug is not this site's", m.siteSlug() === null);
  env({ MAUS_SITE_SLUG: "aad" });
  check('"aad" is the slug', m.siteSlug() === "aad");
  const r = await read({ ...FULL, MAUS_SITE_SLUG: undefined }, json([{ site_status: "maintenance" }]));
  check(
    "no slug (the aad-command-center project): live, and nothing is fetched",
    r.value.status === "live" && r.calls === 0
  );
}

console.log("2. fail open");
{
  let r = await read({ MAUS_SITE_SLUG: "aad" }, json([{ site_status: "maintenance" }]));
  check("settings missing: live, nothing fetched", r.value.status === "live" && r.calls === 0);
  r = await read({ ...FULL, MAUS_STATUS_ANON_KEY: undefined }, json([{ site_status: "maintenance" }]));
  check("key missing: live", r.value.status === "live" && r.calls === 0);
  r = await read(FULL, json([{ site_status: "maintenance" }], 500));
  check("HTTP 500: live", r.value.status === "live");
  r = await read(FULL, json([{ site_status: "maintenance" }], 404));
  check("HTTP 404: live", r.value.status === "live");
  r = await read(FULL, json("{not json"));
  check("malformed JSON: live", r.value.status === "live");
  r = await read(FULL, json([]));
  check("empty result: live", r.value.status === "live");
  r = await read(FULL, json({ site_status: "maintenance" }));
  check("an object, not a list: live", r.value.status === "live");
  r = await read(FULL, json([{ site_status: "Maintenance" }]));
  check('"Maintenance" (wrong case): live', r.value.status === "live");
  r = await read(FULL, json([{ site_status: "MAINTENANCE" }]));
  check('"MAINTENANCE": live', r.value.status === "live");
  r = await read(FULL, json([{ site_status: "maintenance " }]));
  check('"maintenance " with a space: live', r.value.status === "live");
  r = await read(FULL, json([{ site_status: null }]));
  check("null: live", r.value.status === "live");
  r = await read(FULL, json([{ site_status: "live" }]));
  check('"live": live', r.value.status === "live");
  r = await read(FULL, () => {
    throw new TypeError("network down");
  });
  check("network error: live", r.value.status === "live");
  const t0 = Date.now();
  r = await read(
    FULL,
    (init) =>
      new Promise((_, reject) => {
        init.signal.addEventListener("abort", () =>
          reject(new DOMException("timeout", "TimeoutError"))
        );
      })
  );
  const ms = Date.now() - t0;
  check(`a read that times out: live, within 3s (${ms}ms)`, r.value.status === "live" && ms < 3000);
  const t1 = Date.now();
  r = await read(FULL, () => new Promise(() => {}));
  const ms2 = Date.now() - t1;
  check(
    `a read that never settles at all: live, within 3s (${ms2}ms)`,
    r.value.status === "live" && ms2 < 3000
  );
}

console.log('3. exact "maintenance" takes the site down');
{
  let r = await read(
    FULL,
    json([{ site_status: "maintenance", status_message: "  Back at 3pm.  " }])
  );
  check(
    "maintenance, with the message trimmed",
    r.value.status === "maintenance" && r.value.message === "Back at 3pm.",
    JSON.stringify(r.value)
  );
  r = await read(FULL, json([{ site_status: "maintenance", status_message: "" }]));
  check(
    "empty message: maintenance, message null (the page shows its default)",
    r.value.status === "maintenance" && r.value.message === null
  );
  r = await read(FULL, json([{ site_status: "maintenance", status_message: "   " }]));
  check("blank message: message null", r.value.status === "maintenance" && r.value.message === null);
}

console.log("4. it reads one row of the public view and nothing else");
{
  await read(FULL, json([{ site_status: "live" }]));
  const c = calls[0];
  const u = c ? new URL(c.url) : null;
  check("one request", calls.length === 1);
  check("to MAUS_STATUS_URL", !!u && u.origin === STATUS_URL);
  check("the site_status_public view", !!u && u.pathname === "/rest/v1/site_status_public");
  check("for slug aad only", !!u && u.searchParams.get("slug") === "eq.aad");
  check(
    "two columns, one row",
    !!u &&
      u.searchParams.get("select") === "site_status,status_message" &&
      u.searchParams.get("limit") === "1"
  );
  check("a GET", !!c && (c.init.method ?? "GET") === "GET");
  check(
    "apikey and Bearer are the anon key",
    !!c &&
      c.init.headers.apikey === "anon-placeholder" &&
      c.init.headers.authorization === "Bearer anon-placeholder"
  );
  check(
    "never NEXT_PUBLIC_SUPABASE_URL (the booking database)",
    !fs.readFileSync(modPath, "utf8").includes("process.env.NEXT_PUBLIC_SUPABASE")
  );
}

console.log("5. memo, and one warning");
{
  env(FULL);
  m.__resetSiteStatusCache();
  calls = [];
  respond = json([{ site_status: "maintenance" }]);
  await m.getSiteStatus("aad");
  await m.getSiteStatus("aad");
  check("a second request within 20s does not read again", calls.length === 1);
  check(
    "an unknown slug never reads",
    (await m.getSiteStatus("sahara")).status === "live" && calls.length === 1
  );
  warns.length = 0;
  await read(FULL, json([], 500));
  await read(FULL, json([], 500));
  await read(FULL, json("{bad"));
  check("failed reads warn at most once per isolate", warns.length <= 1, `${warns.length} warnings`);
}

// Moves the clock the reader sees, so the 20 second memo can be crossed
// without waiting for it.
async function withClock(fn) {
  const realNow = Date.now;
  const clock = { offset: 0 };
  Date.now = () => realNow() + clock.offset;
  try {
    await fn(clock, realNow);
  } finally {
    Date.now = realNow;
  }
}

console.log("6. a remembered answer is never served past 20 seconds");
// On 2026-10-14, in Troy's live test of Thrive 65 (the same reader), / showed
// the notice while /about served the real page throughout. The reader handed
// back its remembered "live" and refreshed behind the response, and Vercel
// only finishes middleware work handed to waitUntil.
await withClock(async (clock) => {
  env(FULL);
  m.__resetSiteStatusCache();
  respond = json([{ site_status: "live" }]);
  await m.getSiteStatus("aad");
  respond = json([{ site_status: "maintenance" }]);
  clock.offset = 21_000;
  const s = await m.getSiteStatus("aad");
  check("past 20 seconds the next read is fresh, not the remembered answer", s.status === "maintenance", s.status);
});
await withClock(async (clock, realNow) => {
  // A read the edge cut off never settles, not even through its own timeout
  // or a timer beside it. It must not pin every later read to the old answer.
  env(FULL);
  m.__resetSiteStatusCache();
  respond = json([{ site_status: "live" }]);
  await m.getSiteStatus("aad");
  clock.offset = 21_000;
  respond = () => new Promise(() => {});
  const t0 = realNow();
  const first = await m.getSiteStatus("aad");
  const ms = realNow() - t0;
  check(`a read that never answers gives up within 3s and serves the site (${ms}ms)`, first.status === "live" && ms < 3200);
  respond = json([{ site_status: "maintenance" }]);
  clock.offset = 30_000;
  const next = await m.getSiteStatus("aad");
  check("and the read after it is not stuck behind it", next.status === "maintenance", next.status);
});

// --- end to end -------------------------------------------------------------

async function e2e() {
  globalThis.fetch = realFetch;
  console.log("\nkill switch, end to end (next start against a stub)\n");
  if (!fs.existsSync(path.join(root, ".next/BUILD_ID"))) {
    console.log("E2E COULD NOT RUN: no build. Run `npm run build` first.");
    failed++;
    return;
  }
  let mode = { kind: "rows", body: "[]" };
  const stub = http.createServer((req, res) => {
    if (mode.kind === "hang") return; // never answers
    if (mode.kind === "status") {
      res.writeHead(mode.code);
      return res.end("nope");
    }
    res.writeHead(200, { "content-type": "application/json" });
    res.end(mode.body);
  });
  await new Promise((r) => stub.listen(0, "127.0.0.1", r));
  const stubUrl = `http://127.0.0.1:${stub.address().port}`;
  const nextBin = path.join(root, "node_modules/next/dist/bin/next");
  let port = Number(process.env.KS_PORT || 3291);

  async function withServer(settings, fn) {
    port++;
    const childEnv = { ...process.env };
    for (const k of KEYS) delete childEnv[k];
    Object.assign(childEnv, settings);
    const child = spawn(process.execPath, [nextBin, "start", "-p", String(port)], {
      cwd: root,
      env: childEnv,
      stdio: ["ignore", "pipe", "pipe"],
    });
    child.stdout.on("data", () => {});
    child.stderr.on("data", () => {});
    const base = `http://127.0.0.1:${port}`;
    try {
      for (let i = 0; i < 80; i++) {
        try {
          await fetch(base + "/robots.txt");
          break;
        } catch {
          await new Promise((r) => setTimeout(r, 500));
        }
      }
      await fn(base);
    } finally {
      try {
        execSync(`taskkill /pid ${child.pid} /T /F`, { stdio: "ignore" });
      } catch {
        child.kill();
      }
    }
  }
  const all = { MAUS_STATUS_URL: stubUrl, MAUS_STATUS_ANON_KEY: "anon-placeholder", MAUS_SITE_SLUG: "aad" };
  const get = (base, p, init) => fetch(base + p, { redirect: "manual", ...init });
  const isDown = (r) => r.status === 503 && r.headers.get("x-maintenance") === "1";

  console.log("A. down, with a message");
  mode = {
    kind: "rows",
    body: JSON.stringify([{ site_status: "maintenance", status_message: "Back at 3pm today." }]),
  };
  await withServer(all, async (base) => {
    const r = await get(base, "/");
    const html = await r.text();
    check("/ answers 503", r.status === 503, String(r.status));
    check("Retry-After: 300", r.headers.get("retry-after") === "300", String(r.headers.get("retry-after")));
    check("the message is on the page", html.includes("Back at 3pm today."));
    check("in Signature's own branding (its logo)", /aad(\/|%2F)logo\.png/.test(html));
    check("the owners can still be called from it", html.includes("tel:+14807933782"));
    const deep = await get(base, "/some-public-page");
    check(`any public page answers the notice (${deep.status})`, isDown(deep));
    for (const p of [
      "/api/weather",
      "/api/availability",
      "/api/cron/review-requests",
      "/api/admin/system-health/review-requests",
      "/admin",
      "/auth",
      "/auth/callback",
      "/dashboard",
      "/settings",
      "/booking-confirmation/abc",
      "/robots.txt",
      "/sitemap.xml",
      "/manifest.webmanifest",
      "/favicon.ico",
      "/icon",
      "/icon1",
      "/apple-icon",
      "/opengraph-image",
      "/sw.js",
      "/offline.html",
      "/images/aad/logo.png",
      "/apple-touch-icon.png",
    ]) {
      const x = await get(base, p);
      check(`${p} still answers (${x.status})`, !isDown(x) && x.status !== 503);
    }
    const post = await get(base, "/api/create-booking", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{}",
    });
    check(
      `POST /api/create-booking still reaches the route (${post.status})`,
      !isDown(post) && post.status !== 503
    );
    const css = html.match(/\/_next\/static\/[^"]+\.css/);
    check("the notice links its stylesheet", !!css);
    if (css) {
      const s = await get(base, css[0]);
      check(`static files still load (${s.status})`, s.status === 200);
    }
  });

  console.log("B. down, Why box left empty");
  mode = { kind: "rows", body: JSON.stringify([{ site_status: "maintenance", status_message: null }]) };
  await withServer(all, async (base) => {
    const r = await get(base, "/");
    const html = await r.text();
    check(
      "503 with the default words",
      r.status === 503 && html.includes("We are making some improvements and will be right back.")
    );
  });

  const live = async (label, settings, m2) => {
    mode = m2;
    await withServer(settings, async (base) => {
      const t0 = Date.now();
      const r = await get(base, "/");
      check(
        `${label}: / is the real site (${r.status}, ${Date.now() - t0}ms)`,
        r.status === 200 && !r.headers.get("x-maintenance")
      );
    });
  };
  const down = { kind: "rows", body: JSON.stringify([{ site_status: "maintenance" }]) };
  console.log("C. fail open, end to end");
  await live(
    "no MAUS_SITE_SLUG (the aad-command-center project)",
    { MAUS_STATUS_URL: stubUrl, MAUS_STATUS_ANON_KEY: "anon-placeholder" },
    down
  );
  await live("no settings at all", {}, down);
  await live("status server answers 500", all, { kind: "status", code: 500 });
  await live("status server hangs", all, { kind: "hang" });
  await live("bad JSON", all, { kind: "rows", body: "{nope" });
  await live("empty result", all, { kind: "rows", body: "[]" });
  await live('"Maintenance"', all, {
    kind: "rows",
    body: JSON.stringify([{ site_status: "Maintenance" }]),
  });

  console.log("E. warm, then flipped: a static inner page follows within 20 seconds");
  // The order of Troy's live test on Thrive 65, where /about kept serving.
  // /scottsdale is prerendered, the cached kind of page that stayed up there.
  mode = { kind: "rows", body: JSON.stringify([{ site_status: "live" }]) };
  await withServer(all, async (base) => {
    const before = await get(base, "/scottsdale");
    await before.text();
    check(`/scottsdale is 200 while live (${before.status})`, before.status === 200);
    mode = { kind: "rows", body: JSON.stringify([{ site_status: "maintenance" }]) };
    await new Promise((r) => setTimeout(r, 21_000));
    const after = await get(base, "/scottsdale");
    await after.text();
    check(`the first /scottsdale after the flip and 21s is the notice (${after.status})`, isDown(after));
  });

  console.log("D. the notice cannot be forged");
  mode = { kind: "rows", body: "[]" };
  await withServer(all, async (base) => {
    const r = await get(base, "/maintenance");
    check(`/maintenance while live is a 404 (${r.status})`, r.status === 404);
    const f = await get(base, "/", {
      headers: { "x-maintenance": "1", "x-maintenance-message": "forged" },
    });
    const html = await f.text();
    check("a forged x-maintenance header is ignored", f.status === 200 && !html.includes("forged"));
  });
  stub.close();
}

if (E2E && !BROKEN) await e2e();

console.log("");
if (failed) {
  console.log(`  ${failed} FAILED${BROKEN ? "  (expected: --broken must go red)" : ""}`);
  process.exit(1);
}
console.log(`  all ${passed} passed`);
// A selftest that passes is the failure: it exits 0, which is what the
// "must fail" convention reads as broken.
if (BROKEN) {
  console.log("  SELFTEST DID NOT GO RED: the checks cannot tell a broken switch from a working one");
}
