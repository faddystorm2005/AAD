-- Booking expiry for unpaid approvals (P0-1 fix).
--
-- When admin approves a booking, the customer is given 24 hours to pay
-- the deposit. After that the slot frees automatically, so flaked leads
-- can no longer hold a slot indefinitely.
--
-- Two layers handle expiry:
--   1. The availability route filters out approved+unpaid+expired bookings
--      in real time, so the slot becomes bookable instantly once 24h passes.
--   2. A daily cron at /api/cron/expire-approvals flips expired rows to
--      status='declined' and notifies the customer for bookkeeping.

alter table public.bookings
  add column if not exists expires_at timestamptz;

-- Backfill: existing approved-but-unpaid bookings get a fresh 24h grace
-- period from now. Using approved_at + 24h would mass-decline old stuck
-- bookings on rollout; giving them new 24h is friendlier.
update public.bookings
   set expires_at = now() + interval '24 hours'
 where status = 'approved'
   and deposit_paid = false
   and expires_at is null;

-- Partial index for the cron's WHERE clause. Keeps the index small (only
-- the rows that could actually be expiring) and lookups fast.
create index if not exists bookings_expired_approved_idx
  on public.bookings (expires_at)
  where status = 'approved' and deposit_paid = false;
