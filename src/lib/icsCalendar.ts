/**
 * Minimal ICS (iCalendar) feed generator for admin's Google Calendar.
 *
 * Spec: RFC 5545. We emit only the fields Google Calendar needs:
 *   VCALENDAR
 *     VEVENT (one per booking)
 *       UID, DTSTAMP, DTSTART, DTEND, SUMMARY, LOCATION, DESCRIPTION, STATUS
 */

export interface CalendarEvent {
  id: string;
  scheduledAt: string; // ISO datetime
  durationHours: number;
  title: string;
  location?: string;
  description?: string;
  status: 'CONFIRMED' | 'TENTATIVE' | 'CANCELLED';
  /** Optional last-modified timestamp for cache hints. */
  updatedAt?: string;
}

/**
 * Escape per RFC 5545 §3.3.11 - backslash, comma, semicolon, and newline
 * have special meaning in TEXT properties.
 */
function escapeText(s: string): string {
  return s
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

/**
 * Format a Date as an ICS UTC timestamp: YYYYMMDDTHHMMSSZ.
 */
function formatUtc(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}` +
    `T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`
  );
}

/**
 * Lines longer than 75 octets must be folded per RFC 5545 §3.1. Following
 * lines start with a single space (the "fold" continuation marker).
 */
function fold(line: string): string {
  if (line.length <= 75) return line;
  const chunks: string[] = [];
  let i = 0;
  while (i < line.length) {
    const chunk = line.slice(i, i + (i === 0 ? 75 : 74));
    chunks.push(i === 0 ? chunk : ' ' + chunk);
    i += i === 0 ? 75 : 74;
  }
  return chunks.join('\r\n');
}

export function buildIcs(events: CalendarEvent[]): string {
  const now = formatUtc(new Date());
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Signature Mobile Detailing//Bookings//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:Signature Mobile Detailing Bookings',
    'X-WR-TIMEZONE:America/Phoenix',
  ];

  for (const e of events) {
    const start = new Date(e.scheduledAt);
    const end = new Date(start.getTime() + e.durationHours * 60 * 60 * 1000);
    const dtStamp = e.updatedAt ? formatUtc(new Date(e.updatedAt)) : now;

    lines.push('BEGIN:VEVENT');
    lines.push(`UID:booking-${e.id}@austinautodetail.vercel.app`);
    lines.push(`DTSTAMP:${dtStamp}`);
    lines.push(`DTSTART:${formatUtc(start)}`);
    lines.push(`DTEND:${formatUtc(end)}`);
    lines.push(fold(`SUMMARY:${escapeText(e.title)}`));
    if (e.location) lines.push(fold(`LOCATION:${escapeText(e.location)}`));
    if (e.description) lines.push(fold(`DESCRIPTION:${escapeText(e.description)}`));
    lines.push(`STATUS:${e.status}`);
    lines.push('END:VEVENT');
  }

  lines.push('END:VCALENDAR');
  return lines.join('\r\n') + '\r\n';
}
