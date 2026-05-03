-- Payment event idempotency table.
--
-- Records every successful payment capture from PayPal (and later Square)
-- by its provider-supplied unique transmission ID. The webhook handler
-- inserts a row BEFORE updating the booking. If the row already exists
-- (replay or duplicate delivery), the insert fails on the primary key and
-- the handler exits without re-processing.
--
-- Service role only (RLS on, no policies). Customers must never see this.

create table if not exists public.payment_events (
  transmission_id text primary key,
  booking_id      uuid not null references bookings(id) on delete cascade,
  provider        text not null check (provider in ('paypal', 'square')),
  amount          numeric(7,2) not null,
  currency_code   text not null default 'USD',
  event_type      text,
  captured_at     timestamptz not null default now()
);

create index if not exists payment_events_booking_id_idx
  on public.payment_events (booking_id);

alter table public.payment_events enable row level security;
-- No policies. Service role bypasses RLS, authenticated users get nothing.
