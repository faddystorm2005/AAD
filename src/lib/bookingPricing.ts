// ---------------------------------------------------------------
// Service-type data model (added for service-type split rollout)
//
// These constants define the three bookable services and their
// pricing matrix. They are NOT yet wired to the live booking flow
// -- the existing SERVICES export continues to drive bookings
// until Phase 6 of the service-type split, when SERVICE_PRICES
// becomes the source of truth.
// ---------------------------------------------------------------

export const SERVICE_TYPES = ['full_detail', 'interior', 'exterior'] as const;
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
  exterior:    { small: 79,  suv: 89,  truck: 99  },
  interior:    { small: 129, suv: 149, truck: 169 },
  full_detail: { small: 199, suv: 229, truck: 249 },
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

// ---------------------------------------------------------------
// Live pricing (Maus & Co. client portal)
//
// Alex can edit his prices at mausandco.com/portal. A resolved,
// validated price table (see lib/livePricing.ts) can be passed into
// calculatePricing and getAddOnPrice; when absent, the constants
// above apply. Every portal value is numerically validated before it
// ever reaches this file, so a typo in the portal can never produce
// a wrong charge - it just falls back to the baked-in price.
// ---------------------------------------------------------------

export type SizePriceMap = { small: number; suv: number; truck: number };

export type LivePriceTable = {
  services: Record<ServiceType, SizePriceMap>;
  addOns: Record<string, number | SizePriceMap>;
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
  { id: 'wax', name: '6 Month Wax', price: 100, applicableServiceTypes: ['exterior', 'full_detail'] },
  { id: 'engine', name: 'Engine Bay', price: 35, applicableServiceTypes: ['exterior', 'full_detail'] },
  { id: 'stain', name: 'Stain Removal', price: 30, applicableServiceTypes: ['interior', 'full_detail'] },
  { id: 'leather', name: 'Leather Conditioner', price: 20, applicableServiceTypes: ['interior', 'full_detail'] },
  {
    id: 'pethair',
    name: 'Pet Hair Removal',
    price: 0,
    applicableServiceTypes: ['interior', 'full_detail'],
    sizePrices: { small: 25, suv: 40, truck: 40 },
  },
  { id: 'windshield', name: 'Windshield Coating', price: 100, applicableServiceTypes: ['exterior', 'full_detail'] },
  { id: 'headlight', name: 'Headlight Restoration', price: 80, applicableServiceTypes: ['exterior', 'full_detail'] },
  { id: 'paint1', name: '1-Step Paint Correction', price: 125, applicableServiceTypes: ['exterior', 'full_detail'] },
  {
    id: 'paint2',
    name: '2-Step Paint Correction',
    price: 495,
    applicableServiceTypes: ['exterior', 'full_detail'],
    sizePrices: { small: 495, suv: 595, truck: 595 },
  },
  // Ceramic Coating: full-day job. With two detailers it books in any slot,
  // so the old mornings-only / one-per-day restriction has been removed.
  {
    id: CERAMIC_ADDON_ID,
    name: 'Ceramic Coating',
    price: 500,
    description: 'Multi-year protection. Full-day job, so we confirm the day with you when we reach out.',
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
  live?: LivePriceTable,
): number {
  const override = live?.addOns[addon.id];
  if (typeof override === 'number') return override;
  if (override && typeof override === 'object') return override[serviceSize];
  if (addon.sizePrices) {
    return addon.sizePrices[serviceSize];
  }
  return addon.price;
}

export function isCeramicSelected(addOnIds: string[] | null | undefined): boolean {
  return Boolean(addOnIds?.includes(CERAMIC_ADDON_ID));
}

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
  isReturning: boolean;
}

export function calculatePricing(
  data: BookingData,
  opts: {
    isReturning?: boolean;
    customDiscountRate?: number;
    promoDiscountRate?: number;
    /** Portal-managed prices. When present, display and charge both use it. */
    live?: LivePriceTable;
  } = {}
): PricingBreakdown {
  const serviceType = data.serviceType ?? SERVICE_TYPE_DEFAULT;
  const basePrice = (opts.live?.services ?? SERVICE_PRICES)[serviceType][data.serviceSize];
  const addOnsTotal = data.selectedAddOns.reduce((total, addonId) => {
    const addon = ADD_ONS.find((a) => a.id === addonId);
    if (!addon) return total;
    return total + getAddOnPrice(addon, data.serviceSize, opts.live);
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
    isReturning,
  };
}
