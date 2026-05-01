// ---------------------------------------------------------------
// Service-type data model (added for service-type split rollout)
//
// These constants define the three bookable services and their
// pricing matrix. They are NOT yet wired to the live booking flow
// -- the existing SERVICES export continues to drive bookings
// until Phase 6 of the service-type split, when SERVICE_PRICES
// becomes the source of truth.
// ---------------------------------------------------------------

export const SERVICE_TYPES = ['exterior', 'interior', 'full_detail'] as const;
export type ServiceType = typeof SERVICE_TYPES[number];

export const SERVICE_TYPE_NAMES: Record<ServiceType, string> = {
  exterior: 'Exterior Detail',
  interior: 'Interior Detail',
  full_detail: 'Full Detail',
};

// Default service type for backward compatibility with bookings
// made before the split rolled out.
export const SERVICE_TYPE_DEFAULT: ServiceType = 'full_detail';

// Authoritative price matrix: service type x vehicle size.
// Final launch prices, set via business decision.
export const SERVICE_PRICES: Record<ServiceType, { small: number; suv: number; truck: number }> = {
  exterior:    { small: 120, suv: 150, truck: 170 },
  interior:    { small: 180, suv: 210, truck: 230 },
  full_detail: { small: 249, suv: 299, truck: 329 },
};

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
  applicableServiceTypes: ServiceType[];
  /**
   * Optional per-size pricing. When present, overrides the flat
   * price field. Use for add-ons whose cost varies by vehicle size
   * (e.g., pet hair removal).
   */
  sizePrices?: { small: number; suv: number; truck: number };
}

export const ADD_ONS: AddOn[] = [
  { id: 'wax', name: '6 Month Wax', price: 50, applicableServiceTypes: ['exterior', 'full_detail'] },
  { id: 'engine', name: 'Engine Bay', price: 25, applicableServiceTypes: ['exterior', 'full_detail'] },
  { id: 'stain', name: 'Stain Removal', price: 30, applicableServiceTypes: ['interior', 'full_detail'] },
  { id: 'leather', name: 'Leather Conditioner', price: 10, applicableServiceTypes: ['interior', 'full_detail'] },
  { id: 'windshield', name: 'Windshield Coating', price: 40, applicableServiceTypes: ['exterior', 'full_detail'] },
  { id: 'headlight', name: 'Headlight Restoration', price: 80, applicableServiceTypes: ['exterior', 'full_detail'] },
  { id: 'paint1', name: '1-Step Paint Correction', price: 95, applicableServiceTypes: ['exterior', 'full_detail'] },
  { id: 'paint2', name: '2-Step Paint Correction', price: 125, applicableServiceTypes: ['exterior', 'full_detail'] },
  // Ceramic Coating: full-day job at the 9 AM slot, only 1 per day.
  // Adjust price to match Austin Auto Detail's actual ceramic coating rate.
  {
    id: CERAMIC_ADDON_ID,
    name: 'Ceramic Coating',
    price: 500,
    description: 'Multi-year protection. Mornings only - first slot of the day (9:00 AM), full-day job, 1 per day.',
    applicableServiceTypes: ['exterior', 'full_detail'],
  },
];

/**
 * Resolves the correct price for an add-on given a vehicle size.
 * Add-ons with sizePrices use the per-size value; flat-priced
 * add-ons return their price field.
 */
export function getAddOnPrice(
  addon: AddOn,
  serviceSize: 'small' | 'suv' | 'truck',
): number {
  if (addon.sizePrices) {
    return addon.sizePrices[serviceSize];
  }
  return addon.price;
}

export function isCeramicSelected(addOnIds: string[] | null | undefined): boolean {
  return Boolean(addOnIds?.includes(CERAMIC_ADDON_ID));
}

export const DEPOSIT_AMOUNT = 30;
export const RETURNING_CUSTOMER_DISCOUNT_RATE = 0.10;

export interface BookingData {
  vehicleId: string;
  serviceSize: 'small' | 'suv' | 'truck';
  serviceType?: ServiceType;
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
  const serviceType = data.serviceType ?? SERVICE_TYPE_DEFAULT;
  const basePrice = SERVICE_PRICES[serviceType][data.serviceSize];
  const addOnsTotal = data.selectedAddOns.reduce((total, addonId) => {
    const addon = ADD_ONS.find((a) => a.id === addonId);
    if (!addon) return total;
    return total + getAddOnPrice(addon, data.serviceSize);
  }, 0);

  const subtotal = basePrice + addOnsTotal;
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
    service: basePrice,
    addOns: addOnsTotal,
    subtotal,
    discount,
    total,
    deposit: DEPOSIT_AMOUNT,
    isReturning,
  };
}
