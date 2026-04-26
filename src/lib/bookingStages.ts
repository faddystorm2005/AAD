/**
 * Booking workflow stages.
 *
 * Stages are *dynamic per booking* — the visible sequence depends on the
 * add-ons the customer chose. A basic wash skips paint correction and
 * coatings; a full detail with ceramic shows everything.
 *
 * Backward compatibility: pre-refactor bookings stored stage='washing' or
 * stage='waxing'. Those values are still accepted and rendered with the
 * matching new label so in-flight jobs don't break.
 */

import { CERAMIC_ADDON_ID } from './bookingPricing';

export type Stage =
  | 'requested'
  | 'exterior'
  | 'paint_correction'
  | 'interior'
  | 'coatings'
  | 'done'
  // Legacy stage values still present in the DB from before this refactor.
  | 'washing'
  | 'waxing';

export const STAGE_LABELS: Record<Stage, string> = {
  requested: 'Requested',
  exterior: 'Exterior',
  paint_correction: 'Paint Correction',
  interior: 'Interior',
  coatings: 'Coatings',
  done: 'Done',
  // Legacy → display under the new naming so old in-flight bookings still
  // make sense to the customer.
  washing: 'Exterior',
  waxing: 'Coatings',
};

/** Add-on IDs that pull in extra stages. */
const ADDON_TO_STAGE: Record<string, Stage> = {
  paint1: 'paint_correction',
  paint2: 'paint_correction',
  wax: 'coatings',
  windshield: 'coatings',
  [CERAMIC_ADDON_ID]: 'coatings',
};

/**
 * Build the ordered stage list for a single booking from its add-ons.
 * Always includes requested → exterior → interior → done; inserts
 * paint_correction after exterior (if a paint add-on is selected) and
 * coatings before done (if any coating add-on is selected).
 */
export function getStagesForBooking(addons: string[] | null | undefined): Stage[] {
  const triggered = new Set<Stage>();
  for (const a of addons ?? []) {
    const s = ADDON_TO_STAGE[a];
    if (s) triggered.add(s);
  }

  const stages: Stage[] = ['requested', 'exterior'];
  if (triggered.has('paint_correction')) stages.push('paint_correction');
  stages.push('interior');
  if (triggered.has('coatings')) stages.push('coatings');
  stages.push('done');
  return stages;
}

/**
 * Map legacy stage values to their new equivalents so progress bars find
 * the right index when rendering an in-flight booking that started before
 * the refactor.
 */
export function normalizeStage(stage: Stage | string | null | undefined): Stage {
  if (stage === 'washing') return 'exterior';
  if (stage === 'waxing') return 'coatings';
  if (
    stage === 'requested' ||
    stage === 'exterior' ||
    stage === 'paint_correction' ||
    stage === 'interior' ||
    stage === 'coatings' ||
    stage === 'done'
  ) {
    return stage;
  }
  return 'requested';
}

/** Every stage value the update-stage API will accept. */
export const ALL_STAGES = [
  'requested',
  'exterior',
  'paint_correction',
  'interior',
  'coatings',
  'done',
  'washing',
  'waxing',
] as const;
