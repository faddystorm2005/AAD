-- Atomic account-credit operations (P0-3 fix).
--
-- Replaces the read-modify-write pattern in:
--   src/app/api/create-booking/route.ts
--   src/app/api/admin/cancel-approve/route.ts
--
-- Two functions:
--
--   debit_credit_max(user_id, max_amount) -> debited_amount
--     Spends up to max_amount of credit from the user's balance, never
--     going negative. Returns how much was actually debited (0 if there
--     was no credit). Uses FOR UPDATE row lock so two concurrent bookings
--     for the same user serialize and cannot both spend the same dollars.
--
--   issue_credit(user_id, amount) -> new_balance
--     Adds amount to the user's balance atomically. Plain UPDATE with
--     credit_balance = credit_balance + amount is already race-safe
--     (Postgres locks the row during the update), but wrapping it in a
--     function keeps the API consistent and the call-site readable.
--
-- Service role only. Customers can never call these directly because they
-- could spend or grant themselves credit otherwise.

create or replace function public.debit_credit_max(
  p_user_id    uuid,
  p_max_amount numeric
)
returns numeric
language plpgsql
security definer
set search_path = public
as $$
declare
  current_balance numeric;
  debit_amount    numeric;
begin
  if p_max_amount is null or p_max_amount <= 0 then
    return 0;
  end if;

  -- Row lock serializes concurrent debits for the same user.
  select credit_balance into current_balance
    from public.profiles
   where id = p_user_id
   for update;

  if current_balance is null or current_balance <= 0 then
    return 0;
  end if;

  debit_amount := round(least(current_balance, p_max_amount), 2);

  if debit_amount <= 0 then
    return 0;
  end if;

  update public.profiles
     set credit_balance = credit_balance - debit_amount
   where id = p_user_id;

  return debit_amount;
end;
$$;

create or replace function public.issue_credit(
  p_user_id uuid,
  p_amount  numeric
)
returns numeric
language plpgsql
security definer
set search_path = public
as $$
declare
  new_balance numeric;
begin
  if p_amount is null or p_amount <= 0 then
    return null;
  end if;

  update public.profiles
     set credit_balance = credit_balance + round(p_amount, 2)
   where id = p_user_id
   returning credit_balance into new_balance;

  return new_balance;
end;
$$;

-- Lock down access. Service role bypasses these grants but explicit is good.
revoke all on function public.debit_credit_max(uuid, numeric) from public, anon, authenticated;
revoke all on function public.issue_credit(uuid, numeric) from public, anon, authenticated;
grant execute on function public.debit_credit_max(uuid, numeric) to service_role;
grant execute on function public.issue_credit(uuid, numeric) to service_role;
