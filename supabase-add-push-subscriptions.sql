-- Push notification subscriptions for web push API.
-- Run this on Supabase BEFORE deploying the push notification code.
--
-- Two tables:
--   push_subscriptions       -- admin devices
--   customer_push_subscriptions -- per-booking customer subscriptions

-- Admin push subscriptions
create table if not exists push_subscriptions (
  id          uuid primary key default gen_random_uuid(),
  endpoint    text not null unique,
  p256dh      text not null,
  auth        text not null,
  user_agent  text,
  created_at  timestamptz not null default now()
);

alter table push_subscriptions enable row level security;

-- No public access. All access is via service role key (server-only).
-- No RLS policies needed - service role bypasses RLS.

-- Customer push subscriptions (tied to a specific booking + user)
create table if not exists customer_push_subscriptions (
  id          uuid primary key default gen_random_uuid(),
  booking_id  uuid not null references bookings(id) on delete cascade,
  user_id     uuid not null references profiles(id) on delete cascade,
  endpoint    text not null,
  p256dh      text not null,
  auth        text not null,
  user_agent  text,
  created_at  timestamptz not null default now(),
  -- One subscription per device per booking
  unique(booking_id, endpoint)
);

alter table customer_push_subscriptions enable row level security;
-- No public access. All access via service role key (server-only).
