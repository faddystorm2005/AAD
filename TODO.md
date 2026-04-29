# AAD Detailing — Post-Launch Backlog

Things to revisit after the app has run with real customer data for a while.
Don't tackle these before launch — they're optimizations, not blockers.

---

## Booking flow redesign (after real-customer data collected)

Wait for real-customer behavior before redesigning. The data will tell you
which of these matters most.

### Reduce sign-in friction
- Biggest UX win is probably **magic-link email auth** (no password to forget)
- Supabase has it built in — `supabase.auth.signInWithOtp({ email })`
- ~Half day of work
- Tradeoff: customers without easy email access on phone hit a friction wall

### Account creation after booking, or guest checkout
Two patterns to consider:

- **Guest checkout** — collect name + email + phone on the booking form, no
  password, no account. Pro: zero friction. Con: lose returning-customer
  tracking unless you match by email server-side later.

- **Account-after-booking** — customer fills out booking like a guest, then
  after success a small dialog asks *"Save these details for next time? Set
  a password →"*. Best of both worlds.

  Estimate: ~1 day. Touches the booking form, create-booking route, and adds
  a "claim account" flow.

### Facebook Lead Ads integration
- Meta has a webhooks API that pushes leads as JSON when someone fills out
  a Lead Ad form
- Endpoint shape: `POST /api/facebook/lead-webhook` with signature verification
  similar to the PayPal webhook pattern we built
- Hard part isn't the integration — it's mapping their arbitrary form fields
  to our `bookings` schema, plus deduplication against existing customers
- Estimate: 1-2 days

### Meta Business Suite calendar sync
- **Research first** — Meta's calendar APIs are limited compared to Google's
- A 30-min spike reading https://developers.facebook.com/docs/messenger-platform/
  and the Business Suite docs would tell us if this is even a real feature for
  booking apps, or just internal Meta scheduling
- Don't commit to building until research confirms feasibility

---

## Operational cleanup (do within ~1 week of launch)

- [ ] Remove Square fallback once PayPal proves stable in production:
  - `npm uninstall square`
  - Delete `src/lib/squarePayment.ts`
  - Delete `src/app/api/square/webhook/route.ts`
  - Remove kill-switch branching in `src/app/api/admin/approve/route.ts`
  - Delete `SQUARE_*` env vars from Vercel
- [ ] Switch Google Calendar owner from Troy's account to Alex's
  - Update `findAdminUserId()` in `src/lib/googleCalendar.ts` to specifically
    target Alex's user_id, OR have Alex disconnect/reconnect from his account
- [ ] Delete dead code: `src/lib/bookingService.ts` (old client-side booking
  path, no longer in use)
- [ ] Delete test bookings from production database

---

## Nice-to-have (not blocking anything)

- [ ] Twilio SMS notifications — code is wired in `src/lib/notify.ts`, just
      needs the env vars (~$1/month + ~$0.01/SMS)
- [ ] Cancel/reschedule flow — currently no UI to cancel an approved booking
      (only "delete" via danger zone)
- [ ] Race condition fix — slot booking has a tiny SELECT-then-INSERT gap
      (rare for 3-6 bookings/day, real concern at 100+)
- [ ] Automated tests — every bug today is found by manual clicking
- [ ] Error monitoring (Sentry, LogRocket, or similar) so customer issues
      don't go unnoticed
- [ ] Staging environment so production isn't the test environment
