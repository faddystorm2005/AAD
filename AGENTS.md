<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes: APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Stack

The backend is **Supabase** (Postgres, Auth, Realtime, Storage). This project
does **not** use Convex. The `convex/` directory holds nothing but unused
scaffolding left over from a tool that was run once; ignore it.

- Next.js 16 (Turbopack), TypeScript, Tailwind v4
- Supabase for data and auth. Browser client: `src/lib/supabaseClient.ts`.
  Service-role client (server only, bypasses RLS): `src/lib/supabaseAdmin.ts`.
- Deployed on Vercel. Crons are declared in `vercel.json`.
- Schema changes live in the `supabase-*.sql` files at the repo root.

# Payment model

Customers pay **nothing up front**. There is no deposit and no payment link.
Approving a booking just confirms it, then the owners text the customer to
arrange a time and collect the full amount on-site.

There is **no payment processor in this codebase at all**. The PayPal and
Square libraries, their webhook routes, and the payment-link endpoint were all
deleted. Do not reintroduce a processor without being asked. Any copy that
mentions a deposit is a bug.

**`deposit_paid` does not mean the customer paid.** `/api/admin/approve` sets
it `true` at approval time so the booking keeps holding its slot, and both
`/api/availability` and the expire-approvals cron read it to decide whether to
release a slot. Never write it from the UI.

What Alex actually collected on-site lives in separate columns: `paid_at`,
`paid_amount`, `payment_method`. They are written only by
`/api/admin/mark-paid` and read only by the admin UI, so they cannot affect
scheduling. Schema: `supabase-add-payment-tracking.sql`.

# House rules

- **Never use the em-dash character (U+2014)** anywhere in `src/`. Use periods,
  commas, colons, or "and" / "or". Check before committing with:
  `grep -rnP "\x{2014}" src/` (matching by codepoint, so this rule can be
  written down without violating itself).
- Run `npm run build`, not just `tsc --noEmit`. Prerender fails in ways a
  typecheck cannot catch. The build needs Supabase env vars to be set.
- Never hardcode a secret. Read it from `process.env` and fail closed if it is
  missing. This repo is public on GitHub.
- Older and less tech-savvy customers are a core audience: tap targets `py-3`
  or larger, body text 16px or larger, and on black use `gray-200`/`gray-300`,
  never `gray-400`/`gray-500`.
- Plain English over jargon. Keep the tone warm and direct.
- Bump the `VERSION` constant in `public/sw.js` after any meaningful deploy, or
  clients keep serving a stale bundle.
- **Never modify a `.env` file. No agent, no reason, no exceptions.** Tests use
  a separate file or an inline override on the command that needs it. If an env
  file is touched during a session anyway, it is verified against the real
  endpoint before that session ends.

  This exists because it happened twice in one session on this repo:
  `.env.local` was repointed at a local stub so maintenance mode could be
  tested, and once the backup copy was overwritten with the stub values as
  well, so the real credentials were only recoverable from the inlined values
  in `.next/` and from Vercel. A build against a stubbed env looks like a
  normal green build, which is what makes this quiet enough to ship.

## The kill switch

The matcher in `src/proxy.ts` excludes any path with a file extension, which
also exempts a dynamic segment that happens to contain a dot, for example
`/booking-confirmation/abc.def`. That path bypasses the switch and serves the
real page during an outage.

**This is accepted deliberately.** The failure mode is fail-open, which is the
whole design of this feature: a site that stays up when the switch is confused
is the outcome we want, and the opposite, a page nobody can turn back on, is
the one that costs Alex phone calls. Booking IDs are UUIDs, so it is not
reachable in practice. Do not "fix" it by tightening the matcher without
checking what else that would start intercepting.

# Timezone

The business is in Phoenix, Arizona, which stays on MST (UTC-7) **year round
and does not observe daylight saving time**. Always build times through the
helpers in `src/lib/phoenixTime.ts` rather than hardcoding an offset.
