-- =========================================================================
-- Cancellation request workflow + customer account credit
-- =========================================================================
-- Run this in Supabase Dashboard -> SQL Editor.
-- Safe to run more than once (idempotent).
--
-- Adds:
--   * bookings.cancel_requested_at      (timestamptz, nullable)
--   * bookings.cancel_request_reason    (text, nullable)
--   * profiles.credit_balance           (numeric, default 0)
--
-- These let customers REQUEST a cancellation (instead of self-cancelling),
-- and let admins approve/deny that request and optionally issue account
-- credit toward a future booking.
-- =========================================================================

-- 1. Track the request itself on the booking row.
-- A non-null cancel_requested_at means "customer wants out, awaiting admin
-- decision". The booking's main status (pending/approved/confirmed) does
-- NOT change until the admin acts on the request.
alter table public.bookings
  add column if not exists cancel_requested_at timestamptz;

alter table public.bookings
  add column if not exists cancel_request_reason text;

-- 2. Customer account credit balance.
-- Credit is awarded by the admin when approving a cancellation (or as a
-- goodwill gesture) and is deducted at booking-creation time when present.
alter table public.profiles
  add column if not exists credit_balance numeric(7,2) not null default 0;

-- Sanity check: credit can never go negative. (At application level we'll
-- never set it negative either, but the constraint is a belt-and-suspenders.)
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'profiles_credit_balance_nonneg'
  ) then
    alter table public.profiles
      add constraint profiles_credit_balance_nonneg
      check (credit_balance >= 0);
  end if;
end$$;

-- 3. Track how much account credit was applied to each booking so the
-- customer's history shows it and any future refund/dispute can reverse
-- the right amount. Defaults to 0 for legacy rows.
alter table public.bookings
  add column if not exists credit_applied numeric(7,2) not null default 0;

-- 4. Helpful index for the admin "pending cancellation requests" filter.
create index if not exists bookings_cancel_requested_idx
  on public.bookings (cancel_requested_at)
  where cancel_requested_at is not null;

-- =========================================================================
-- Done. The bookings.status enum still doesn't need a 'cancellation_requested'
-- value because the request lives in dedicated columns. The existing 'cancelled'
-- (or 'declined' fallback) status is still what gets set when the admin
-- actually approves the cancellation.
-- =========================================================================
