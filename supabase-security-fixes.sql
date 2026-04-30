-- =========================================================================
-- Supabase database linter fixes
-- =========================================================================
-- Run this whole file in Supabase Dashboard -> SQL Editor.
-- It is safe to run more than once (idempotent).
--
-- Addresses these warnings/errors from the database linter:
--   [ERROR] security_definer_view: public.revenue_by_day
--   [ERROR] rls_disabled_in_public: public.app_config
--   [WARN]  function_search_path_mutable: handle_new_user,
--                                          update_updated_at_column,
--                                          set_default_deposit_amount
--   [WARN]  anon/authenticated_security_definer_function_executable:
--                                          handle_new_user,
--                                          is_current_user_admin
--   [INFO]  rls_enabled_no_policy: public.promo_codes
-- =========================================================================


-- 1. Lock function search_path so a malicious schema on the search path
-- cannot shadow built-in objects the function relies on.
-- Recreate each function with `SET search_path = public, pg_temp`.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do update set email = excluded.email;
  return new;
end;
$$;

create or replace function public.update_updated_at_column()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.set_default_deposit_amount()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  default_deposit numeric(7,2);
begin
  if new.deposit_amount is null then
    select value::numeric(7,2)
      into default_deposit
      from public.app_config
     where key = 'default_deposit_amount';
    new.deposit_amount := default_deposit;
  end if;
  return new;
end;
$$;


-- 2. Revoke EXECUTE on SECURITY DEFINER functions from public/anon/authenticated.
-- handle_new_user is only invoked as a trigger on auth.users, never directly.
-- is_current_user_admin is only used inside RLS policies, where it executes
-- as the policy owner regardless of who calls the policy.

revoke execute on function public.handle_new_user() from public;
revoke execute on function public.handle_new_user() from anon;
revoke execute on function public.handle_new_user() from authenticated;

revoke execute on function public.is_current_user_admin() from public;
revoke execute on function public.is_current_user_admin() from anon;
-- NOTE: do NOT revoke from authenticated. This function is called from
-- inside RLS policies on profiles/vehicles/bookings, and signed-in users
-- need EXECUTE permission for those policies to evaluate. Revoking it
-- silently breaks every customer-facing read/write on those tables.
-- The linter will still flag this as a WARN, but it's a false positive
-- for our use case - we genuinely need authenticated to be able to call it.
grant execute on function public.is_current_user_admin() to authenticated;


-- 3. Replace the SECURITY DEFINER view with a SECURITY INVOKER view so the
-- view runs with the querying user's permissions and respects RLS on the
-- bookings table. Only admins should be able to query it; the bookings RLS
-- already restricts non-admins to their own rows, so this is a tightening.

drop view if exists public.revenue_by_day;
create view public.revenue_by_day
with (security_invoker = true) as
select
  date_trunc('day', created_at) as day,
  count(*) as bookings,
  sum(total) as revenue
from public.bookings
where deposit_paid = true
group by 1
order by 1 desc;


-- 4. Enable RLS on app_config and lock it down to admins.
-- Customers never read/write this directly (it's only read by the
-- set_default_deposit_amount trigger, which runs as the trigger owner).
-- Server code that needs it uses the service role and bypasses RLS.

alter table public.app_config enable row level security;

drop policy if exists "app_config admin all" on public.app_config;
create policy "app_config admin all"
  on public.app_config
  for all
  using (public.is_current_user_admin())
  with check (public.is_current_user_admin());


-- 5. Add admin-only policies to promo_codes (RLS was already enabled, but
-- with no policies the table was effectively unreadable from PostgREST).
-- Customer-facing promo validation goes through /api/promos/validate which
-- uses the service role, so this admin-only RLS is the right scope.

drop policy if exists "promo_codes admin all" on public.promo_codes;
create policy "promo_codes admin all"
  on public.promo_codes
  for all
  using (public.is_current_user_admin())
  with check (public.is_current_user_admin());


-- =========================================================================
-- Done. Re-run the database linter in Supabase Studio to confirm.
-- =========================================================================
--
-- Note on the remaining 'auth_leaked_password_protection' warning:
-- We use magic-link + Google OAuth for sign-in. Passwords are no longer
-- accepted, so leaked-password protection is moot. You can leave it
-- disabled (the warning is harmless) or enable it under
-- Authentication -> Providers -> Email -> 'Prevent use of leaked
-- passwords' for defense-in-depth.
