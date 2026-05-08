-- Supabase schema for AAD Detailing

-- Profiles store extra user data and admin access.
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  email text,
  is_admin boolean default false,
  created_at timestamp with time zone default now()
);

-- In case the profiles table was created before the email column existed.
alter table profiles add column if not exists email text;

-- Auto-create a profile row whenever a new auth user is created, syncing email.
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do update set email = excluded.email;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function handle_new_user();

-- Backfill profiles + emails for users that existed before the trigger was added.
insert into public.profiles (id, email)
select id, email from auth.users
on conflict (id) do update set email = excluded.email;

-- Saved vehicles belong to a user.
create table if not exists vehicles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  year integer not null,
  make text not null,
  model text not null,
  size text not null,
  color text,
  nickname text,
  created_at timestamp with time zone default now()
);

-- Booking stages for the live tracker.
do $$
begin
  if not exists (select 1 from pg_type where typname = 'booking_stage') then
    create type booking_stage as enum ('requested', 'washing', 'waxing', 'interior', 'done');
  end if;
end$$;

-- Configuration table for app-wide settings
create table if not exists app_config (
  key text primary key,
  value jsonb not null
);

-- Insert default deposit amount if not exists
insert into app_config (key, value)
values ('default_deposit_amount', '30.00')
on conflict (key) do nothing;

-- Add-ons are stored as JSON because the admin and customer screens can read them.
create table if not exists bookings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  vehicle_id uuid references vehicles(id) on delete cascade,
  size text not null,
  service text not null,
  addons jsonb default '[]'::jsonb,
  scheduled_at timestamp with time zone not null,
  -- Note: The 'updated_at' column is set on insert and automatically updated by a trigger on row updates.
  -- Any direct update to 'updated_at' will be overwritten by the trigger.
  updated_at timestamp with time zone default now(),
  address text not null,
  city text,
  state text,
  zip text,
  deposit_amount numeric(7,2) not null,
  deposit_paid boolean not null default false,
  discount_applied boolean not null default false,
  subtotal numeric(7,2) not null,
  total numeric(7,2) not null,
  booking_stage booking_stage not null default 'requested',
  started_at timestamp with time zone,
  completed_at timestamp with time zone,
  review_request_sent_at timestamp with time zone,
  review_request_followup_sent_at timestamp with time zone,
  created_at timestamp with time zone default now()
);

-- In case the bookings table was created before these columns existed.
alter table bookings add column if not exists started_at timestamp with time zone;
alter table bookings add column if not exists completed_at timestamp with time zone;
alter table bookings add column if not exists discount_amount numeric(7,2) not null default 0;
alter table bookings add column if not exists slot_date date;
alter table bookings add column if not exists slot_time time;
alter table bookings add column if not exists is_ceramic boolean not null default false;
alter table bookings add column if not exists review_request_sent_at timestamp with time zone;
alter table bookings add column if not exists review_request_followup_sent_at timestamp with time zone;

-- Partial index for the review-request cron's query path. Filters on
-- (completed_at, status) but only over rows that haven't been emailed yet,
-- so the index stays tiny as historical bookings accumulate.
create index if not exists idx_bookings_review_eligible
  on bookings (completed_at, status)
  where review_request_sent_at is null;

-- Partial index for the v2 follow-up pass: rows that already got the
-- initial review request but haven't had the 7-day follow-up sent yet.
-- Same partial-where trick keeps the index size proportional to the
-- live followup backlog rather than the full bookings history.
create index if not exists idx_bookings_review_followup_eligible
  on bookings (review_request_sent_at)
  where review_request_sent_at is not null
    and review_request_followup_sent_at is null;

-- Status workflow (Phase 2): pending → approved → confirmed → in_progress → completed,
-- with declined as a terminal branch from pending.
do $$
begin
  if not exists (select 1 from pg_type where typname = 'booking_status') then
    create type booking_status as enum (
      'pending',
      'approved',
      'declined',
      'confirmed',
      'in_progress',
      'completed'
    );
  end if;
end$$;

alter table bookings add column if not exists status booking_status not null default 'pending';
alter table bookings add column if not exists decline_reason text;
alter table bookings add column if not exists payment_url text;
alter table bookings add column if not exists approved_at timestamp with time zone;
alter table bookings add column if not exists declined_at timestamp with time zone;

-- Backfill existing bookings into the new status field. Only touch rows that
-- still have the default 'pending' so we don't clobber later admin changes.
update bookings set status =
  case
    when booking_stage = 'done' then 'completed'::booking_status
    when booking_stage in ('washing', 'waxing', 'interior') then 'in_progress'::booking_status
    when deposit_paid = true then 'confirmed'::booking_status
    else 'pending'::booking_status
  end
where status = 'pending';

-- Daily capacity: tracks whether help is available on a given day.
-- Solo (default, no row or is_help_available=false): 1 car/slot, 3 cars/day max.
-- Help available (is_help_available=true): 2 cars/slot, 6 cars/day max.
create table if not exists daily_capacity (
  day date primary key,
  is_help_available boolean not null default false,
  updated_at timestamp with time zone default now()
);

alter table daily_capacity enable row level security;

drop policy if exists "daily_capacity all read" on daily_capacity;
create policy "daily_capacity all read"
  on daily_capacity for select
  using (true);

drop policy if exists "daily_capacity admin write" on daily_capacity;
create policy "daily_capacity admin write"
  on daily_capacity for all
  using (is_current_user_admin())
  with check (is_current_user_admin());

-- Realtime so the admin's capacity toggle reflects on the customer booking form.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'daily_capacity'
  ) then
    alter publication supabase_realtime add table daily_capacity;
  end if;
end$$;

-- Trigger to keep updated_at current.
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_updated_at on bookings;
create trigger set_updated_at
before update on bookings
for each row
execute function update_updated_at_column();

-- Trigger to set deposit_amount from config if not provided
create or replace function set_default_deposit_amount()
returns trigger as $$
declare
  default_deposit numeric(7,2);
begin
  if new.deposit_amount is null then
    select value::numeric(7,2) into default_deposit from app_config where key = 'default_deposit_amount';
    new.deposit_amount := default_deposit;
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_deposit_amount_default on bookings;
create trigger set_deposit_amount_default
before insert on bookings
for each row
execute function set_default_deposit_amount();

-- Helper: is the current user an admin?
-- SECURITY DEFINER so it bypasses RLS when checking the profiles table,
-- which avoids recursion when this function is used inside profiles policies.
create or replace function is_current_user_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select coalesce(
    (select is_admin from public.profiles where id = auth.uid()),
    false
  );
$$;

-- Row-level security: enable on user-owned tables.
alter table profiles enable row level security;
alter table vehicles enable row level security;
alter table bookings enable row level security;

-- Profiles policies.
drop policy if exists "profiles self read" on profiles;
create policy "profiles self read"
  on profiles for select
  using (id = auth.uid() or is_current_user_admin());

drop policy if exists "profiles self update" on profiles;
create policy "profiles self update"
  on profiles for update
  using (id = auth.uid())
  with check (id = auth.uid() and is_admin = (select is_admin from profiles where id = auth.uid()));

-- Self-heal: a logged-in user can create THEIR OWN profile row if it's missing.
-- This guards against the rare case where the auth-user trigger didn't fire
-- (e.g., signups created before the trigger was installed).
drop policy if exists "profiles self insert" on profiles;
create policy "profiles self insert"
  on profiles for insert
  with check (id = auth.uid());

-- Vehicles policies (users manage their own; admins read all).
drop policy if exists "vehicles self all" on vehicles;
create policy "vehicles self all"
  on vehicles for all
  using (user_id = auth.uid() or is_current_user_admin())
  with check (user_id = auth.uid());

-- Bookings policies.
drop policy if exists "bookings self read" on bookings;
create policy "bookings self read"
  on bookings for select
  using (user_id = auth.uid() or is_current_user_admin());

drop policy if exists "bookings self insert" on bookings;
create policy "bookings self insert"
  on bookings for insert
  with check (user_id = auth.uid());

-- Only admins can update bookings from the client. The webhook and admin API
-- both use the service role, which bypasses RLS entirely.
drop policy if exists "bookings admin update" on bookings;
create policy "bookings admin update"
  on bookings for update
  using (is_current_user_admin())
  with check (is_current_user_admin());

-- Register bookings with the realtime publication so customer dashboards
-- receive postgres_changes events when admins advance stages.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'bookings'
  ) then
    alter publication supabase_realtime add table bookings;
  end if;
end$$;

-- View: revenue_by_day
-- Purpose: Summarizes daily revenue from bookings where the deposit has been paid.
-- Columns:
--   day: The date (truncated to day) when the booking was created.
--   bookings: The number of bookings for that day.
--   revenue: The total revenue (sum of 'total') for that day.
create or replace view revenue_by_day as
select
  date_trunc('day', created_at) as day,
  count(*) as bookings,
  sum(total) as revenue
from bookings
where deposit_paid = true
group by day
order by day desc;
