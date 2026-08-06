// ---------------------------------------------------------------
// Default "is help available" resolution.
//
// A day's capacity comes from one of two places, in this order:
//   1. An explicit row in daily_capacity, written by the admin panel.
//   2. Otherwise, the day-of-week default stored in app_config under
//      the key default_help_available_dow (an array of 0-6, Sunday=0).
//
// Both the availability route and the reschedule route need this, and
// they used to each carry their own copy - which meant reschedule
// silently defaulted to solo while the booking page defaulted to help.
// One helper, one answer, no drift.
// ---------------------------------------------------------------

import { supabaseAdmin } from './supabaseAdmin';

/** Read the configured day-of-week defaults. Bad or missing config = solo. */
export async function fetchDefaultHelpDow(): Promise<number[]> {
  const { data } = await supabaseAdmin
    .from('app_config')
    .select('value')
    .eq('key', 'default_help_available_dow')
    .maybeSingle();

  if (!Array.isArray(data?.value)) return [];
  return (data.value as unknown[]).filter(
    (n): n is number => typeof n === 'number' && n >= 0 && n <= 6
  );
}

/**
 * Day of week for a YYYY-MM-DD string. Noon UTC is always the same
 * calendar date in Phoenix, so this never slips a day.
 */
export function dayOfWeekFor(date: string): number {
  return new Date(date + 'T12:00:00Z').getUTCDay();
}

/**
 * Final answer for one day. Pass the explicit daily_capacity value when
 * there is a row for that day; pass undefined when there isn't.
 */
export function resolveHelpAvailable(
  date: string,
  explicit: boolean | undefined,
  defaultHelpDow: number[]
): boolean {
  if (explicit !== undefined) return explicit;
  return defaultHelpDow.includes(dayOfWeekFor(date));
}
