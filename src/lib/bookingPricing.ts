export const SERVICES = {
  small: {
    name: 'Small Sedan / Coupe',
    price: 199,
  },
  suv: {
    name: 'SUV',
    price: 219,
  },
  truck: {
    name: 'Truck / 3-Row',
    price: 249,
  },
};

export const CERAMIC_ADDON_ID = 'ceramic';

export interface AddOn {
  id: string;
  name: string;
  price: number;
  /** Optional helper text shown beneath the name in the booking form. */
  description?: string;
}

export const ADD_ONS: AddOn[] = [
  { id: 'wax', name: '6 Month Wax', price: 50 },
  { id: 'engine', name: 'Engine Bay', price: 25 },
  { id: 'stain', name: 'Stain Removal', price: 30 },
  { id: 'leather', name: 'Leather Conditioner', price: 10 },
  { id: 'windshield', name: 'Windshield Coating', price: 40 },
  { id: 'headlight', name: 'Headlight Restoration', price: 80 },
  { id: 'paint1', name: '1-Step Paint Correction', price: 95 },
  { id: 'paint2', name: '2-Step Paint Correction', price: 125 },
  // Ceramic Coating: full-day job at the 9 AM slot, only 1 per day.
  // Adjust price to match Austin Auto Detail's actual ceramic coating rate.
  {
    id: CERAMIC_ADDON_ID,
    name: 'Ceramic Coating',
    price: 500,
    description: 'Lasts up to 10 years. Mornings only - first slot of the day (9:00 AM), full-day job, 1 per day.',
  },
];

export function isCeramicSelected(addOnIds: string[] | null | undefined): boolean {
  return Boolean(addOnIds?.includes(CERAMIC_ADDON_ID));
}

export const DEPOSIT_AMOUNT = 30;
export const RETURNING_CUSTOMER_DISCOUNT_RATE = 0.10;

export interface BookingData {
  vehicleId: string;
  serviceSize: 'small' | 'suv' | 'truck';
  selectedAddOns: string[];
  scheduledAt: string;
  address: string;
  city: string;
  state: string;
  zip: string;
}

export interface PricingBreakdown {
  service: number;
  addOns: number;
  subtotal: number;
  discount: number;
  total: number;
  deposit: number;
  isReturning: boolean;
}

export function calculatePricing(
  data: BookingData,
  opts: {
    isReturning?: boolean;
    customDiscountRate?: number;
    promoDiscountRate?: number;
  } = {}
): PricingBreakdown {
  const service = SERVICES[data.serviceSize];
  const addOnsTotal = data.selectedAddOns.reduce((total, addonId) => {
    const addon = ADD_ONS.find((a) => a.id === addonId);
    return total + (addon?.price || 0);
  }, 0);

  const subtotal = service.price + addOnsTotal;
  const isReturning = opts.isReturning ?? false;

  // Use the highest of (returning, per-user, promo code). Discounts don't
  // stack - pick the best one to keep math simple and predictable.
  // All rates are clamped to [0, 50%].
  const customRate = Math.max(0, Math.min(50, opts.customDiscountRate ?? 0)) / 100;
  const promoRate = Math.max(0, Math.min(50, opts.promoDiscountRate ?? 0)) / 100;
  const returningRate = isReturning ? RETURNING_CUSTOMER_DISCOUNT_RATE : 0;
  const effectiveRate = Math.max(customRate, returningRate, promoRate);

  // Round discount to whole cents to avoid floating-point drift in DB / Square.
  const discount = effectiveRate > 0
    ? Math.round(subtotal * effectiveRate * 100) / 100
    : 0;
  const total = Math.round((subtotal - discount) * 100) / 100;

  return {
    service: service.price,
    addOns: addOnsTotal,
    subtotal,
    discount,
    total,
    deposit: DEPOSIT_AMOUNT,
    isReturning,
  };
}
