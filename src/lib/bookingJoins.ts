/**
 * Types for the embedded rows that come back from the `customer:profiles!...`
 * and `vehicle:vehicles!...` selects on `bookings`.
 *
 * supabase-js infers an embed as an ARRAY even when the foreign key makes it
 * to-one, so `booking.customer.full_name` does not typecheck and the code used
 * to cast to `any` to get past it. `oneOf` narrows both shapes at runtime and
 * keeps the types honest.
 */

/**
 * Fields are optional because each query projects a different subset. The
 * calendar feed asks for `full_name, phone`; the notify paths also ask for
 * `email`. Marking them optional lets one type serve every projection without
 * lying about what a given query actually selected.
 */
export interface JoinedCustomer {
  full_name?: string | null;
  phone?: string | null;
  email?: string | null;
}

export interface JoinedVehicle {
  year: number | string | null;
  make: string | null;
  model: string | null;
  color?: string | null;
  nickname?: string | null;
}

/**
 * Normalize a to-one embed that may arrive as an object, a single-element
 * array, null, or undefined. Returns null when there is nothing joined.
 */
export function oneOf<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}
