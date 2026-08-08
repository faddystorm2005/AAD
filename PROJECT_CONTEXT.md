# Signature Mobile Detailing — Project Context

**Drop this file into a new Claude / AI chat to bring it up to speed on the codebase.**

---

## What the app is

A booking site for **Signature Mobile Detailing**, a mobile detailing business in Phoenix, AZ run by two owners, Alex Browning and Kane Pexa. Customers request a slot, an owner approves it, then the owners text to lock in a time. There is NO deposit: the full amount is paid on-site once the detail is done. Six details a day max, two-person capacity ("quality over quantity").

Live at: **https://www.austin-autodetail.com** (deployed on Vercel). "Austin Auto Detail" is the former trading name; the business is now Signature Mobile Detailing and the domain was kept.

---

## Who I am (the user)

- **Amber**, beginner dev, building this site for my buddy Alex.
- Communicate with me clearly and concisely, in small steps.
- I don't always know jargon. Plain English helps.
- The site is in production with real customers, so don't make destructive moves without checking first.

---

## Tech stack

- **Next.js 16.2.4** with **Turbopack** (NOT the Next.js you know — read `node_modules/next/dist/docs/` before writing code; APIs differ from training data).
- **TypeScript**, **Tailwind v4**.
- **Supabase** (Postgres + Auth + Realtime).
- **No payment processor at all.** Deposits were removed and customers pay in full on-site, so the PayPal and Square libraries, their webhooks, and the payment-link route were deleted outright. Alex records what he collected via the admin "Mark as paid" button.
- **Twilio** SMS + **Resend** email for notifications.
- **Google Calendar** integration (admin-side ICS feed + OAuth push).
- **Open-Meteo** for weather forecasts on booking dates (no API key).
- Service worker for offline caching (`public/sw.js` — bump `VERSION` constant to flush stale clients).

---

## Project rules (read before writing code)

From `AGENTS.md` / `CLAUDE.md`:
- Read `node_modules/next/dist/docs/` before writing Next.js code. This Next.js has breaking changes vs. older versions.
- **NEVER use em-dashes** (—) anywhere on the site. Use periods, commas, colons, or "and" / "or" instead. (User explicitly removed them site-wide.)
- Don't push directly to `main` — but in this repo we push to `master`. Pushing was blocked at one point by GitHub branch protection; if blocked, ask user to push.
- Always run `npm run build` (not just `npx tsc --noEmit`) before pushing — Next.js prerender can fail in ways TypeScript-only checks miss. Lost 8 consecutive Vercel deploys to this once.
- Vercel deploys must be verified green after pushing. Use `npx vercel ls` or check the dashboard.
- Windows builds occasionally crash with code 3221226505 / svgload errors. These are environmental — retry the build, Vercel's Linux builders don't have this issue.

---

## Timezones

- Phoenix, Arizona stays on **MST (UTC-7) year round and does NOT observe daylight saving time**. The `phoenixOffsetFor(date)` helper in `src/lib/phoenixTime.ts` resolves the offset through `Intl` rather than hardcoding it. Use it when constructing TIMESTAMPTZ for `scheduled_at`.

---

## Authentication (current state)

- **Two options on `/auth`**:
  1. **Continue with Google** (OAuth, primary/recommended)
  2. **Continue with email** (magic link via `signInWithOtp`, secondary)
- Email path sends both a clickable link AND a 6-10 digit OTP code (Supabase project setting). User can either click the link on the same device, or type the code on a different device (cross-device sign-in flow).
- No passwords. The old password sign-in/sign-up was removed.
- First-time users (zero vehicles on file) get redirected to `/dashboard?firstTime=1` from `/auth/callback`, which auto-opens the Add Vehicle modal.
- Sessions persist indefinitely on Free plan (Time-box and Inactivity timeout both = "never"). Users only sign in once per device.
- `src/lib/supabaseClient.ts` has explicit `persistSession: true`, `autoRefreshToken: true`, `detectSessionInUrl: true`.

---

## Database schema (key tables)

### `profiles`
- `id` (uuid, FK to auth.users)
- `full_name`, `phone`, `email`
- `is_admin` (boolean)
- `custom_discount_rate` (0-50%) + `discount_single_use` (boolean)
- `credit_balance` (numeric, default 0, ≥ 0 check) — auto-applied to next booking total

### `vehicles`
- Per-customer saved cars (`year`, `make`, `model`, `size`, `color`, `nickname`).

### `bookings`
- `status` enum: `pending | approved | declined | cancelled | confirmed | in_progress | completed`
- `booking_stage` enum: `requested | washing | waxing | interior | done` (and a few more added via SQL)
- `cancel_requested_at` + `cancel_request_reason` — customer requests cancellation, admin reviews
- `credit_applied` — how much account credit was used at booking time
- `decline_reason` / `cancelled_at` / `declined_at` — audit columns
- `payment_url` — PayPal order URL once approved
- `addons` (jsonb), `is_ceramic` (boolean, locks slot)

### `app_config`
- Key/value config (e.g., `default_deposit_amount = 30.00`). RLS-protected, admin-only.

### `promo_codes`
- Admin-managed promo codes. RLS-protected, admin-only (validated server-side via service role).

### `revenue_by_day` view
- Recreated as `SECURITY INVOKER` so it respects bookings RLS.

---

## Major features

### Customer-facing
- **Homepage** (`/`): marketing site with services, mission section, "real value" stat (4+ hrs saved per detail), trust pillars, FAQ, testimonials marquee, sticky Book Now CTA.
- **Auth** (`/auth`): Google + magic link, with cross-device code option.
- **Dashboard** (`/dashboard`): time-based greeting, personal stats (vehicles, bookings, days a member, account credit if any), quick actions grid, vehicles list, bookings list, gallery.
- **Settings** (`/settings`): profile (name/phone/email), vehicles, past bookings.
- **Booking flow** (modal): 3 steps — pick car & extras → when/where → review & submit.
- **Reschedule modal**: change the slot.
- **Cancellation requests**: customer requests with optional reason; admin approves (with optional credit) or denies. Customer cannot cancel directly anymore.
- **Booking confirmation** (`/booking-confirmation/[id]`): status and stage progress. No payment step; the page tells the customer we will text to lock in a time and that they pay on-site.
- **Account credit**: admin issues credit when approving cancellations, auto-applies at next booking.

### Admin-facing (`/admin`)
- Booking list with filters: Pending, **Cancel Requests (N)**, Active, All.
- Per-booking: approve (confirms only, no payment link), decline (with reason), advance stage, delete (danger zone).
- Cancellation request review: approve with optional credit input, OR deny with optional note. Either path texts/emails the customer.
- Manage admins (promote/demote users).
- Manage promo codes.
- Manage users (per-user discount + delete account with safeguards).
- Daily capacity panel (set per-day cap).
- Google Calendar OAuth connect (admin's calendar gets booking events).

---

## Notifications (`src/lib/notify.ts`)

All best-effort (never throw):
- `sendSms(to, body)` — Twilio
- `sendEmail({ to, subject, html, text })` — Resend
- `notifyAdminNewBooking(...)` — SMS to admin on new booking
- `notifyAdminCancellationRequest(...)` — SMS to admin on cancel request
- `notifyCustomerCarReady(...)` — SMS + email on stage='done'
- `notifyCustomerCancellationApproved(...)` — SMS + email when cancel approved (mentions credit if issued)
- `notifyCustomerCancellationDenied(...)` — SMS + email when cancel denied (with optional admin note)

Resend is also configured as the SMTP provider for Supabase auth emails (avoids Supabase's 3-emails-per-hour built-in limit).

---

## Env vars

Set in Vercel project → Settings → Environment Variables:

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY        # server-only, RLS bypass

# Cache purge, called by the Maus & Co. portal's publish button.
# MUST be set or /api/revalidate refuses every request (fails closed).
REVALIDATE_SECRET

# Cron auth. All three /api/cron/* routes require Bearer <CRON_SECRET>.
CRON_SECRET

# NOTE: the PayPal and Square vars (PAYMENT_PROCESSOR, PAYPAL_CLIENT_ID,
# PAYPAL_CLIENT_SECRET, PAYPAL_ENVIRONMENT, PAYPAL_WEBHOOK_ID, SQUARE_*) are
# no longer read by any code and can be deleted from the Vercel project.

# Notifications
RESEND_API_KEY
NOTIFY_FROM_EMAIL                # notifications@austin-autodetail.com
TWILIO_ACCOUNT_SID
TWILIO_AUTH_TOKEN
TWILIO_FROM_NUMBER
ADMIN_NOTIFY_PHONE               # optional override; falls back to admin.profile.phone
```

---

## Recent work (last session, ~30 commits)

In rough order:

1. Auth simplification — Google + magic link, no passwords (`d16b955`).
2. Confirmation toast on dashboard after sign-in (`d582b0c`).
3. Auto-redirect signed-in users away from /auth (`cb528a5`).
4. Cross-device sign-in via OTP code (`d75ab2d`, `1dfdef4`).
5. Phone-number nag banner on dashboard (`ddfa007`).
6. Cancellation request workflow + customer account credit (`2a851e1`).
7. Dashboard liveliness — greeting, stats, quick actions (`aa405b8`).
8. Homepage Mission + Real Value sections (`b24103b`, `315b3aa`, `a3fd772`).
9. Booking flow: bigger touch targets, plain language (`e8d75cf`).
10. Three readability passes — bigger text, real buttons, higher contrast across dashboard, settings, reschedule modal, booking confirmation, homepage, vehicle forms (`13c418e`, `6cbedb6`, `c8eff4a`).
11. Auth visual hierarchy — Google primary, email secondary (`e0934da`).
12. Supabase database linter security fixes via `supabase-security-fixes.sql` (`b894387`, `525971e`).
13. SQL migration for cancellation requests + credit columns: `supabase-cancellation-requests.sql`.
14. Explicit Supabase client auth options (`5000744`).

---

## Standing UX rules (apply to all new work)

- **Older / less-tech-savvy users are a target audience**. Make tap targets at least py-3+, body text 16px+, contrast WCAG AA on black (gray-200/300, never gray-400/500 for body).
- **Plain English over jargon.** "Pick a time" beats "Time slot *". "Tap whichever works" beats "Select an option".
- **Real buttons, not text links** for actions. A 12px text link is invisible on a phone.
- **No em-dashes.** Use commas, colons, periods, or "and" instead.
- **Keep the tone warm + direct.** Like Alex talking, not corporate marketing.

---

## Known gotchas

- Pushing to master directly may be blocked by branch protection; if so, ask user to push.
- Vercel rejects builds with placeholder git author emails. User's git config should match her GitHub primary email.
- The `cancelled` status enum value may not exist on all DB instances — there's a fallback to `declined` in cancel routes.
- `is_current_user_admin()` SECURITY DEFINER function MUST have EXECUTE granted to `authenticated` or RLS policies on profiles/vehicles/bookings break for everyone.
- Supabase email OTP length is per-project (6-10 digits). Auth page accepts up to 10.
- Service worker can serve stale bundles; bump `VERSION` constant in `public/sw.js` after meaningful deploys.

---

## When in doubt

- Ask the user before making destructive moves (DB migrations, force-push, deleting features).
- Run `npm run build` before pushing.
- Verify Vercel deploy goes green via `npx vercel ls`.
- Read `node_modules/next/dist/docs/` for Next.js 16 specifics.
