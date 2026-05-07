// Time helpers for AAD Detailing in Austin, TX.
// Austin observes DST (CDT = UTC-5 in summer, CST = UTC-6 in winter), so
// we never hardcode an offset - `Intl` handles the DST switch automatically.

const AUSTIN_TZ = 'America/Chicago';

/** Today's date as Austin sees it, in YYYY-MM-DD form. */
export function todayAustinDateString(): string {
  // 'en-CA' locale formats dates as YYYY-MM-DD, which is what <input type="date"> expects.
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: AUSTIN_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

/**
 * Current wall-clock moment in Austin as { date: 'YYYY-MM-DD', time: 'HH:MM:SS' }.
 * Used to block same-day slots whose start time has already passed (e.g. it's
 * 9:00 PM and the form would otherwise still offer the 9 AM, 1 PM, 5 PM slots).
 * Both server (Vercel UTC) and client (any user TZ) compute the same Austin
 * wall clock through Intl, so the past-slot check agrees on both sides.
 */
export function austinNowParts(): { date: string; time: string } {
  const now = new Date();
  const date = new Intl.DateTimeFormat('en-CA', {
    timeZone: AUSTIN_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
  const time = new Intl.DateTimeFormat('en-GB', {
    timeZone: AUSTIN_TZ,
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
 * UTC offset for a given Austin-local calendar date, e.g. "-05:00" (CDT) or
 * "-06:00" (CST). Used to build a TIMESTAMPTZ string like "2026-07-04T09:00:00-05:00".
 *
 * Slot times are 9am / 1pm / 5pm, all far from the 2am DST transition, so the
 * date alone is enough to determine the offset unambiguously.
 */
export function austinOffsetFor(dateStr: string): string {
  // Noon UTC on the given date is always 6am or 7am Austin - same calendar date,
  // and well after the 2am DST switch on transition days.
  const ref = new Date(`${dateStr}T12:00:00Z`);
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: AUSTIN_TZ,
    timeZoneName: 'longOffset',
  }).formatToParts(ref);
  // `longOffset` returns strings like "GMT-05:00" - strip the "GMT" prefix.
  const tz = parts.find((p) => p.type === 'timeZoneName')?.value ?? 'GMT-06:00';
  return tz.replace('GMT', '');
}
