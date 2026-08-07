-- Migration: track the payment Alex actually collects on-site.
--
-- Why this is a new set of columns instead of reusing `deposit_paid`:
--
-- `deposit_paid` no longer means "the customer has paid". Deposits were
-- removed from the booking flow, and /api/admin/approve now sets
-- deposit_paid = true at approval time on purpose, so that an approved
-- booking keeps holding its slot. Two places depend on that meaning:
--
--   * src/app/api/availability/route.ts   (releases a slot when an
--     approved booking is deposit_paid = false and has an expires_at)
--   * src/app/api/cron/expire-approvals/route.ts  (same condition)
--
-- So `deposit_paid` is really "this booking holds its slot / nothing is
-- owed up front". Overloading it to also mean "Alex got paid" is what made
-- the old admin toggle useless. These columns are separate and are read by
-- nothing except the admin UI, so they cannot affect scheduling.
--
-- Safe to run on live data: every column is nullable with no default, so
-- existing rows simply read as "not yet paid" until Alex marks them.

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS paid_at timestamp with time zone;

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS paid_amount numeric(10,2);

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS payment_method text;

-- Valid methods, enforced at the database layer so a bad client cannot
-- write junk. 'other' is the escape hatch (check, Cash App, split payment).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'bookings_payment_method_check'
  ) THEN
    ALTER TABLE bookings
      ADD CONSTRAINT bookings_payment_method_check
      CHECK (
        payment_method IS NULL
        OR payment_method IN ('cash', 'card', 'venmo', 'zelle', 'other')
      );
  END IF;
END $$;

-- A payment is either fully recorded or not recorded at all. This stops a
-- half-written row (paid_at set but no amount) from showing up as paid.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'bookings_payment_complete_check'
  ) THEN
    ALTER TABLE bookings
      ADD CONSTRAINT bookings_payment_complete_check
      CHECK (
        (paid_at IS NULL AND paid_amount IS NULL AND payment_method IS NULL)
        OR (paid_at IS NOT NULL AND paid_amount IS NOT NULL AND payment_method IS NOT NULL)
      );
  END IF;
END $$;

-- Amount collected can differ from the quote (add-ons done on the spot, a
-- discount Alex gives in person), but it can never be negative.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'bookings_paid_amount_positive'
  ) THEN
    ALTER TABLE bookings
      ADD CONSTRAINT bookings_paid_amount_positive
      CHECK (paid_amount IS NULL OR paid_amount >= 0);
  END IF;
END $$;

-- Partial index for "what have I collected this month" style questions.
-- Only paid rows are indexed, so it stays small.
CREATE INDEX IF NOT EXISTS idx_bookings_paid_at
  ON bookings (paid_at)
  WHERE paid_at IS NOT NULL;
