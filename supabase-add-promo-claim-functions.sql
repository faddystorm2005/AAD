-- Atomic promo-code claim / release (P0-2 fix).
--
-- Replaces the read-validate-then-increment pattern in
-- src/app/api/create-booking/route.ts which let a code with one remaining
-- use be claimed by two concurrent bookings.
--
-- claim_promo_use(p_code text)
--   Validates and increments in a single UPDATE. The WHERE clause checks
--   active + not expired + uses_count < max_uses. If any of those fail,
--   no row is updated and the function returns an empty result.
--   Returns the new uses_count alongside the discount_rate so the caller
--   can apply pricing without a second read.
--
-- release_promo_use(p_promo_id uuid)
--   Decrements uses_count by 1 (clamped at 0) so the caller can refund
--   a claim if the booking insert fails after the claim succeeded.
--
-- Service role only.

create or replace function public.claim_promo_use(p_code text)
returns table (
  promo_id      uuid,
  promo_code    text,
  discount_rate numeric,
  uses_count    integer,
  max_uses      integer
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  update public.promo_codes
     set uses_count = promo_codes.uses_count + 1
   where promo_codes.code = upper(trim(p_code))
     and promo_codes.active = true
     and (promo_codes.expires_at is null or promo_codes.expires_at >= now())
     and (promo_codes.max_uses is null or promo_codes.uses_count < promo_codes.max_uses)
  returning
     promo_codes.id,
     promo_codes.code,
     promo_codes.discount_rate,
     promo_codes.uses_count,
     promo_codes.max_uses;
end;
$$;

create or replace function public.release_promo_use(p_promo_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  new_count integer;
begin
  update public.promo_codes
     set uses_count = greatest(0, uses_count - 1)
   where id = p_promo_id
  returning uses_count into new_count;

  return new_count;
end;
$$;

revoke all on function public.claim_promo_use(text) from public, anon, authenticated;
revoke all on function public.release_promo_use(uuid) from public, anon, authenticated;
grant execute on function public.claim_promo_use(text) to service_role;
grant execute on function public.release_promo_use(uuid) to service_role;
