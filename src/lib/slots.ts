// All slot times are stored as "wall clock" Phoenix-local times (America/Phoenix).
// Arizona does not observe DST, so Phoenix is MST (UTC-7) year round. See
// src/lib/phoenixTime.ts for the helper that resolves the UTC offset.

export type SlotTime = '09:00:00' | '13:00:00' | '17:00:00';

export const SLOT_TIMES: SlotTime[] = ['09:00:00', '13:00:00', '17:00:00'];

export const SLOT_LABELS: Record<SlotTime, string> = {
  '09:00:00': '9:00 AM',
  '13:00:00': '1:00 PM',
  '17:00:00': '5:00 PM',
};

// Ceramic coating used to be locked to the 9 AM (first) slot, one per day,
// because it is a full-day job and there was only one detailer. There are two
// detailers now, so ceramic books like any other job: any slot with capacity.
// CERAMIC_SLOT is kept only as the label for the first slot of the day.
export const CERAMIC_SLOT: SlotTime = '09:00:00';

export const SOLO_PER_SLOT = 1;
export const HELP_PER_SLOT = 2;
export const SOLO_PER_DAY = 3;
export const HELP_PER_DAY = 6;

export function perSlotCapacity(isHelp: boolean) {
  return isHelp ? HELP_PER_SLOT : SOLO_PER_SLOT;
}

export function perDayCapacity(isHelp: boolean) {
  return isHelp ? HELP_PER_DAY : SOLO_PER_DAY;
}

export interface SlotCounts {
  '09:00:00': number;
  '13:00:00': number;
  '17:00:00': number;
}

export interface SlotAvailability {
  time: SlotTime;
  label: string;
  takenCount: number;
  perSlotCapacity: number;
  /** Is at least one ceramic coating booked at this slot? */
  ceramicTaken: boolean;
  /** Slot start time has already passed in Phoenix local time (only true when date == today). */
  pastSlot: boolean;
  /** Available for a NON-ceramic booking. */
  availableForRegular: boolean;
  /** Available for a CERAMIC booking. */
  availableForCeramic: boolean;
}

export interface DayAvailability {
  date: string; // YYYY-MM-DD
  isHelpAvailable: boolean;
  totalBookings: number;
  perDayCapacity: number;
  ceramicBooked: boolean;
  slots: SlotAvailability[];
}

interface BookingRow {
  slot_time: SlotTime;
  is_ceramic: boolean;
}

/**
 * Decide which slots are bookable on a given day, given today's bookings and
 * whether help is available. Used by both the customer booking form (display)
 * and the create-booking server route (authoritative validation).
 *
 * `now` is the current Phoenix wall-clock moment ({ date, time }). When the
 * requested `date` matches `now.date`, any slot whose start time is at or
 * before `now.time` is marked pastSlot=true and rendered unbookable. Pass
 * undefined to skip the past-slot check (useful for unit tests).
 */
export function computeAvailability(
  date: string,
  isHelpAvailable: boolean,
  bookings: BookingRow[],
  now?: { date: string; time: string }
): DayAvailability {
  const counts: SlotCounts = { '09:00:00': 0, '13:00:00': 0, '17:00:00': 0 };
  let ceramicBooked = false;
  for (const b of bookings) {
    if (b.slot_time in counts) counts[b.slot_time] += 1;
    if (b.is_ceramic) ceramicBooked = true;
  }
  const perSlot = perSlotCapacity(isHelpAvailable);
  const perDay = perDayCapacity(isHelpAvailable);
  const totalBookings = bookings.length;
  const dayFull = totalBookings >= perDay;

  const slots: SlotAvailability[] = SLOT_TIMES.map((time) => {
    const taken = counts[time];
    const ceramicHere =
      time === CERAMIC_SLOT && bookings.some((b) => b.slot_time === time && b.is_ceramic);
    // Past-slot check: only relevant when the requested date is today in
    // Phoenix. String comparison works because both are zero-padded HH:MM:SS.
    const pastSlot = !!now && now.date === date && time <= now.time;
    // Regular booking rule: slot has capacity AND day not full AND slot
    // hasn't already started. Ceramic no longer blocks other bookings.
    const availableForRegular = !dayFull && !pastSlot && taken < perSlot;
    // Ceramic now books on exactly the same terms as everything else.
    const availableForCeramic = availableForRegular;
    return {
      time,
      label: SLOT_LABELS[time],
      takenCount: taken,
      perSlotCapacity: perSlot,
      ceramicTaken: ceramicHere,
      pastSlot,
      availableForRegular,
      availableForCeramic,
    };
  });

  return {
    date,
    isHelpAvailable,
    totalBookings,
    perDayCapacity: perDay,
    ceramicBooked,
    slots,
  };
}
