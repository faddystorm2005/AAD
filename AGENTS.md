<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
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

The PayPal and Square libraries in `src/lib/` are vestigial from the old
deposit flow. Do not wire them back into the booking flow without being asked.
Any copy that mentions a deposit is a bug.

# House rules

- **Never use em-dashes (—)** anywhere in `src/`. Use periods, commas, colons,
  or "and" / "or". Check with `grep -rn "—" src/` before committing.
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

# Timezone

The business is in Phoenix, Arizona, which stays on MST (UTC-7) **year round
and does not observe daylight saving time**. Always build times through the
helpers in `src/lib/phoenixTime.ts` rather than hardcoding an offset.
