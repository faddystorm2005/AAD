// Time helpers for AAD Detailing in Austin, TX.
// Austin observes DST (CDT = UTC-5 in summer, CST = UTC-6 in winter), so
// we never hardcode an offset — `Intl` handles the DST switch automatically.

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
 * UTC offset for a given Austin-local calendar date, e.g. "-05:00" (CDT) or
 * "-06:00" (CST). Used to build a TIMESTAMPTZ string like "2026-07-04T09:00:00-05:00".
 *
 * Slot times are 9am / 1pm / 5pm, all far from the 2am DST transition, so the
 * date alone is enough to determine the offset unambiguously.
 */
export function austinOffsetFor(dateStr: string): string {
  // Noon UTC on the given date is always 6am or 7am Austin — same calendar date,
  // and well after the 2am DST switch on transition days.
  const ref = new Date(`${dateStr}T12:00:00Z`);
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: AUSTIN_TZ,
    timeZoneName: 'longOffset',
  }).formatToParts(ref);
  // `longOffset` returns strings like "GMT-05:00" — strip the "GMT" prefix.
  const tz = parts.find((p) => p.type === 'timeZoneName')?.value ?? 'GMT-06:00';
  return tz.replace('GMT', '');
}
