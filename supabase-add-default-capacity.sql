-- Default future capacity by day-of-week (P0-5 fix).
--
-- The admin's daily_capacity panel only covers 14 days ahead, so days
-- further out always fell back to solo capacity (3/day) even when help
-- would actually be available. This costs bookings on busy weekends 2+
-- weeks out.
--
-- The availability route reads this config row and uses it as the
-- fallback for any day that doesn't have an explicit daily_capacity
-- row. The 14-day admin panel still works for one-off overrides; this
-- is just the "what's the baseline" setting for everything beyond.
--
-- Day-of-week numbering matches JavaScript Date.getUTCDay():
--   0 = Sunday, 1 = Monday, ..., 6 = Saturday.
--
-- Example values:
--   '[]'                  -> no defaults (legacy behavior, solo on every
--                            unconfigured day)
--   '[0, 6]'              -> help available on weekends by default
--   '[0, 1, 2, 3, 4, 5, 6]' -> help always available by default
--
-- Default on insert is '[]' so behavior does not change until Alex
-- explicitly sets the config to match his actual schedule.

insert into public.app_config (key, value)
values ('default_help_available_dow', '[]'::jsonb)
on conflict (key) do nothing;
