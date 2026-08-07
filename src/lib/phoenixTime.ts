// Time helpers for Signature Mobile Detailing in Phoenix, AZ.
// Arizona does not observe daylight saving time, so Phoenix sits on MST
// (UTC-7) all year round. We still resolve the offset through `Intl` rather
// than hardcoding it, so the code stays correct if the rule ever changes.

const PHOENIX_TZ = 'America/Phoenix';

/** Today's date as Phoenix sees it, in YYYY-MM-DD form. */
export function todayPhoenixDateString(): string {
  // 'en-CA' locale formats dates as YYYY-MM-DD, which is what <input type="date"> expects.
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: PHOENIX_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

/**
 * Current wall-clock moment in Phoenix as { date: 'YYYY-MM-DD', time: 'HH:MM:SS' }.
 * Used to block same-day slots whose start time has already passed (e.g. it's
 * 9:00 PM and the form would otherwise still offer the 9 AM, 1 PM, 5 PM slots).
 * Both server (Vercel UTC) and client (any user TZ) compute the same Phoenix
 * wall clock through Intl, so the past-slot check agrees on both sides.
 */
export function phoenixNowParts(): { date: string; time: string } {
  const now = new Date();
  const date = new Intl.DateTimeFormat('en-CA', {
    timeZone: PHOENIX_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
  const time = new Intl.DateTimeFormat('en-GB', {
    timeZone: PHOENIX_TZ,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(now);
  // 'en-GB' returns 'HH:MM:SS' but uses '24:00:00' at midnight on some
  // engines, so normalize the leading-24 edge case to '00:00:00'.
  return { date, time: time.startsWith('24') ? '00' + time.slice(2) : time };
}

/**
 * Which Phoenix calendar month a moment falls in, as 'YYYY-MM'.
 *
 * Needed because a payment recorded at, say, 6 PM Phoenix on the last day of
 * the month is already the 1st in UTC. Bucketing on the raw timestamp would
 * push it into the next month and quietly misreport the monthly total.
 */
export function phoenixMonthKey(when: string | Date): string {
  const d = typeof when === 'string' ? new Date(when) : when;
  // 'en-CA' gives ISO-style ordering, so year-then-month formats as '2026-08'.
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: PHOENIX_TZ,
    year: 'numeric',
    month: '2-digit',
  }).format(d);
}

/** The 'YYYY-MM' key for the Phoenix month `back` months before now (0 = this month). */
export function phoenixMonthKeyAgo(back: number): string {
  const [year, month] = todayPhoenixDateString().split('-').map(Number);
  // Build the target month at noon UTC on the 15th, far from any boundary
  // where the UTC and Phoenix calendar dates could disagree.
  const d = new Date(Date.UTC(year, month - 1 - back, 15, 12, 0, 0));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

/** Human label for a 'YYYY-MM' key, e.g. '2026-08' becomes 'August 2026'. */
export function phoenixMonthLabel(monthKey: string): string {
  const [year, month] = monthKey.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, 15, 12, 0, 0)).toLocaleDateString(undefined, {
    timeZone: PHOENIX_TZ,
    month: 'long',
    year: 'numeric',
  });
}

/**
 * UTC offset for a given Phoenix-local calendar date. Arizona stays on MST
 * year round, so this returns "-07:00" every day. Used to build a
 * TIMESTAMPTZ string like "2026-07-04T09:00:00-07:00".
 */
export function phoenixOffsetFor(dateStr: string): string {
  // Noon UTC on the given date is 5am Phoenix - the same calendar date.
  const ref = new Date(`${dateStr}T12:00:00Z`);
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: PHOENIX_TZ,
    timeZoneName: 'longOffset',
  }).formatToParts(ref);
  // `longOffset` returns strings like "GMT-07:00" - strip the "GMT" prefix.
  const tz = parts.find((p) => p.type === 'timeZoneName')?.value ?? 'GMT-07:00';
  return tz.replace('GMT', '');
}
