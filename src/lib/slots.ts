// All slot times are stored as "wall clock" Austin-local times (America/Chicago).
// Austin observes DST, so see src/lib/austinTime.ts for the helpers that
// resolve the correct UTC offset for a given calendar date.

export type SlotTime = '09:00:00' | '13:00:00' | '17:00:00';

export const SLOT_TIMES: SlotTime[] = ['09:00:00', '13:00:00', '17:00:00'];

export const SLOT_LABELS: Record<SlotTime, string> = {
  '09:00:00': '9:00 AM',
  '13:00:00': '1:00 PM',
  '17:00:00': '5:00 PM',
};

// Ceramic coating runs the 9 AM (first) slot only — it's a full-day job
// that needs an early start and time to cure. Only car detailed that day.
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
 */
export function computeAvailability(
  date: string,
  isHelpAvailable: boolean,
  bookings: BookingRow[]
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
    // Regular booking rule: slot has capacity AND no ceramic blocking it AND day not full.
    const availableForRegular =
      !dayFull && taken < perSlot && !(time === CERAMIC_SLOT && ceramicHere);
    // Ceramic rule: only the 9 AM (first) slot, only if it's empty AND no
    // ceramic anywhere this day.
    const availableForCeramic = time === CERAMIC_SLOT && taken === 0 && !ceramicBooked;
    return {
      time,
      label: SLOT_LABELS[time],
      takenCount: taken,
      perSlotCapacity: perSlot,
      ceramicTaken: ceramicHere,
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
