/**
 * How a customer paid Alex on-site.
 *
 * Kept in one place because three layers have to agree: the admin UI, the
 * /api/admin/mark-paid route that validates the value, and the CHECK
 * constraint in supabase-add-payment-tracking.sql. If you add a method here,
 * add it to that constraint too or the write will be rejected.
 */
export const PAYMENT_METHODS = ['cash', 'card', 'venmo', 'zelle', 'other'] as const;

export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: 'Cash',
  card: 'Card',
  venmo: 'Venmo',
  zelle: 'Zelle',
  other: 'Other',
};

export function isPaymentMethod(value: unknown): value is PaymentMethod {
  return PAYMENT_METHODS.includes(value as PaymentMethod);
}
