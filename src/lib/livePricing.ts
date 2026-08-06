// ---------------------------------------------------------------
// Live price table from the Maus & Co. client portal.
//
// Alex edits his prices at mausandco.com/portal. The values are
// stored as strings in a read-only public view; this module fetches
// them, validates every one numerically, and returns a complete
// LivePriceTable. Any missing, blank, or non-numeric value falls
// back to the constants in bookingPricing.ts, so the homepage, the
// booking form, and the server-side charge calculation always agree
// - and a portal typo can never produce a wrong or blank price.
//
// This file is intentionally NOT server-only: the booking form
// (client) fetches the same table so the price a customer sees while
// booking is the price the server charges.
// ---------------------------------------------------------------

import {
  ADD_ONS,
  SERVICE_PRICES,
  SERVICE_TYPES,
  type LivePriceTable,
  type ServiceType,
  type SizePriceMap,
} from './bookingPricing';

const CMS_URL =
  'https://uitwrgxckeckfximxxai.supabase.co/rest/v1/portal_public_content' +
  '?slug=eq.aad&select=content';
// Publishable key: safe to ship in code by design (read-only public view).
const CMS_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVpdHdyZ3hja2Vja2Z4aW14eGFpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk1ODUwMzcsImV4cCI6MjA5NTE2MTAzN30.lqMLS_iyaKgi-PutwgH3Q6iFRptb5fMXu-7Ju4tdx8s';

/**
 * Strict money parser. Accepts "199", "$199", "1,299", "199.50".
 * Rejects anything else ("from $25", "", "abc", negative, zero) by
 * returning null so the caller falls back to the baked-in price.
 */
function num(v: unknown): number | null {
  if (typeof v === 'number') {
    return Number.isFinite(v) && v > 0 ? v : null;
  }
  if (typeof v !== 'string') return null;
  const cleaned = v.replace(/[$,\s]/g, '');
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function pick(obj: unknown, path: string): unknown {
  let cur: unknown = obj;
  for (const key of path.split('.')) {
    if (cur === null || typeof cur !== 'object') return undefined;
    cur = (cur as Record<string, unknown>)[key];
  }
  return cur;
}

/** The baked-in prices from bookingPricing.ts, as a complete table. */
export function defaultPriceTable(): LivePriceTable {
  const services = {} as Record<ServiceType, SizePriceMap>;
  for (const type of SERVICE_TYPES) {
    services[type] = { ...SERVICE_PRICES[type] };
  }
  const addOns: Record<string, number | SizePriceMap> = {};
  for (const a of ADD_ONS) {
    addOns[a.id] = a.sizePrices ? { ...a.sizePrices } : a.price;
  }
  return { services, addOns };
}

// Portal content keys -> service types. The portal stores prices as
// pricing.full_sedan, pricing.interior_suv, etc.
const SERVICE_CONTENT_KEYS: Record<ServiceType, string> = {
  full_detail: 'full',
  interior: 'interior',
  exterior: 'exterior',
};
const SIZE_CONTENT_KEYS: Record<keyof SizePriceMap, string> = {
  small: 'sedan',
  suv: 'suv',
  truck: 'truck',
};

// Add-on ids -> portal content keys under "addons". Flat-priced add-ons only.
const ADDON_CONTENT_KEYS: Record<string, string> = {
  wax: 'wax',
  engine: 'engine_bay',
  stain: 'stain',
  leather: 'leather',
  windshield: 'windshield',
  headlight: 'headlight',
  paint1: 'paint1',
  ceramic: 'ceramic',
};

// Add-ons priced per vehicle size. The portal stores these as
// addons.pet_hair_sedan, addons.paint2_truck, and so on. A plain
// addons.paint2 is still honoured and applies to all three sizes,
// so an older portal entry never gets ignored.
const PER_SIZE_ADDON_KEYS: Record<string, string> = {
  pethair: 'pet_hair',
  paint2: 'paint2',
};

/** Merge raw portal content over the defaults, validating every value. */
export function resolvePriceTable(raw: unknown): LivePriceTable {
  const table = defaultPriceTable();
  const sizes = Object.keys(SIZE_CONTENT_KEYS) as (keyof SizePriceMap)[];

  for (const type of SERVICE_TYPES) {
    for (const size of sizes) {
      const key = `pricing.${SERVICE_CONTENT_KEYS[type]}_${SIZE_CONTENT_KEYS[size]}`;
      const v = num(pick(raw, key));
      if (v !== null) table.services[type][size] = v;
    }
  }

  for (const [addonId, contentKey] of Object.entries(ADDON_CONTENT_KEYS)) {
    const v = num(pick(raw, `addons.${contentKey}`));
    if (v !== null) table.addOns[addonId] = v;
  }

  // Per-size add-ons. A flat portal value applies to every size first, then
  // any per-size value overrides it.
  for (const [addonId, contentKey] of Object.entries(PER_SIZE_ADDON_KEYS)) {
    const entry = table.addOns[addonId];
    if (!entry || typeof entry !== 'object') continue;
    const flat = num(pick(raw, `addons.${contentKey}`));
    if (flat !== null) {
      for (const size of sizes) entry[size] = flat;
    }
    for (const size of sizes) {
      const v = num(pick(raw, `addons.${contentKey}_${SIZE_CONTENT_KEYS[size]}`));
      if (v !== null) entry[size] = v;
    }
  }

  return table;
}

/**
 * Fetch the live price table. Never throws; on any problem the
 * defaults come back and the site behaves exactly as it shipped.
 * Pass { fresh: true } where money changes hands (the create-booking
 * route) so the charge always uses the latest saved prices.
 */
export async function fetchLivePriceTable(opts?: {
  fresh?: boolean;
}): Promise<LivePriceTable> {
  try {
    const init: RequestInit & { next?: { revalidate: number; tags: string[] } } = {
      headers: { apikey: CMS_KEY, Authorization: `Bearer ${CMS_KEY}` },
    };
    if (opts?.fresh) {
      init.cache = 'no-store';
    } else {
      init.next = { revalidate: 300, tags: ['cms'] };
    }
    const res = await fetch(CMS_URL, init);
    if (!res.ok) return defaultPriceTable();
    const rows = (await res.json()) as Array<{ content?: unknown }>;
    return resolvePriceTable(rows?.[0]?.content ?? null);
  } catch {
    return defaultPriceTable();
  }
}
