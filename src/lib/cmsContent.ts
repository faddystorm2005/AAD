/**
 * Pure helpers that read the Maus & Co. portal content document.
 *
 * Every read takes a dot path key into the content JSON and falls back to
 * the matching value in a defaults object (the copy baked into this repo).
 * A blank, missing or wrongly typed portal value always renders the
 * default, so a portal typo can never blank out the site.
 *
 * No imports and no JSX on purpose: scripts/test-cms-content.mjs and
 * scripts/build-portal-seed.mjs load this file straight into Node.
 */

export type Content = Record<string, unknown>;

/** Walk a dot path ("hero.eyebrow", "cities.mesa.h1") into an object. */
export function pick(obj: unknown, path: string): unknown {
  let cur: unknown = obj;
  for (const key of path.split('.')) {
    if (cur === null || typeof cur !== 'object') return undefined;
    cur = (cur as Record<string, unknown>)[key];
  }
  return cur;
}

function asText(v: unknown): string {
  if (typeof v === 'string') return v;
  if (typeof v === 'number' && Number.isFinite(v)) return String(v);
  return '';
}

function filled(v: string): boolean {
  return v.trim() !== '';
}

/** A portal string if it has any text in it, otherwise the fallback. */
export function readText(content: unknown, key: string, fallback: string): string {
  const v = pick(content, key);
  return typeof v === 'string' && filled(v) ? v : fallback;
}

export type ListItem<F extends string> = Record<F, string>;

function normalizeItem<F extends string>(item: unknown, fields: readonly F[]): ListItem<F> {
  const out = {} as ListItem<F>;
  const rec = item !== null && typeof item === 'object' ? (item as Record<string, unknown>) : {};
  for (const f of fields) out[f] = asText(rec[f]);
  return out;
}

/**
 * Contract rule 2. When the portal value is an array with at least one item
 * that has any non-empty field, the portal items render in their order and
 * all-empty items are skipped. Otherwise the code defaults render. A field
 * missing from an item comes back as '' so the caller can hide that element.
 */
export function readList<F extends string>(
  content: unknown,
  key: string,
  fields: readonly F[],
  defaults: readonly unknown[],
): ListItem<F>[] {
  const v = pick(content, key);
  if (Array.isArray(v)) {
    const items = v
      .map((item) => normalizeItem(item, fields))
      .filter((item) => fields.some((f) => filled(item[f])));
    if (items.length > 0) return items;
  }
  return defaults.map((item) => normalizeItem(item, fields));
}

/** Same rule for a list of plain lines (stringItems in the portal). */
export function readStringList(
  content: unknown,
  key: string,
  defaults: readonly string[],
): string[] {
  const v = pick(content, key);
  if (Array.isArray(v)) {
    const items = v
      .map((item) =>
        item !== null && typeof item === 'object'
          ? asText((item as Record<string, unknown>).value)
          : asText(item),
      )
      .filter(filled);
    if (items.length > 0) return items;
  }
  return [...defaults];
}

// Photos come either from this repo's public/ folder or from the portal's
// portal-media bucket. Anything else is ignored: next/image would throw on a
// host that is not listed in next.config.ts and take the page down with it.
const PORTAL_MEDIA_PREFIX =
  'https://uitwrgxckeckfximxxai.supabase.co/storage/v1/object/public/';

export function isAllowedImage(src: string): boolean {
  const s = src.trim();
  if (s.startsWith('/') && !s.startsWith('//')) return true;
  return s.startsWith(PORTAL_MEDIA_PREFIX) && !/\s/.test(s);
}

export function readImage(content: unknown, key: string, fallback: string): string {
  const v = readText(content, key, fallback);
  return isAllowedImage(v) ? v.trim() : fallback;
}

export type ContactLink = { display: string; href: string };

/** US phone number in any format. Anything that is not 10 digits falls back. */
export function phoneLink(display: string): ContactLink | null {
  const digits = display.replace(/\D/g, '');
  if (digits.length === 10) return { display, href: `tel:+1${digits}` };
  if (digits.length === 11 && digits.startsWith('1')) return { display, href: `tel:+${digits}` };
  return null;
}

export function readPhone(content: unknown, key: string, fallback: string): ContactLink {
  const own = phoneLink(readText(content, key, fallback));
  return own ?? (phoneLink(fallback) as ContactLink);
}

export function readEmail(content: unknown, key: string, fallback: string): ContactLink {
  const v = readText(content, key, fallback).trim();
  const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
  const email = ok ? v : fallback;
  return { display: email, href: `mailto:${email}` };
}

/**
 * Binds a content document to a defaults object so components can read by
 * key alone. The defaults object uses the same dot paths as the content, so
 * it doubles as the seed for the portal editor. A key with no default is a
 * typo in this repo, so it throws (and fails the build) instead of
 * rendering an empty string.
 */
export function createCopy(content: unknown, defaults: Content) {
  const def = (key: string): unknown => {
    const v = pick(defaults, key);
    if (v === undefined) throw new Error(`No default copy for "${key}"`);
    return v;
  };
  const defText = (key: string): string => {
    const v = def(key);
    if (typeof v !== 'string') throw new Error(`Default copy for "${key}" is not text`);
    return v;
  };
  return {
    text: (key: string) => readText(content, key, defText(key)),
    image: (key: string) => readImage(content, key, defText(key)),
    phone: (key: string) => readPhone(content, key, defText(key)),
    email: (key: string) => readEmail(content, key, defText(key)),
    list: <F extends string>(key: string, fields: readonly F[]) => {
      const d = def(key);
      return readList(content, key, fields, Array.isArray(d) ? d : []);
    },
    strings: (key: string) => {
      const d = def(key);
      return readStringList(content, key, Array.isArray(d) ? (d as string[]) : []);
    },
    /** The baked-in value for a key, for "is this still the default photo?" checks. */
    fallback: defText,
  };
}

export type Copy = ReturnType<typeof createCopy>;

/** Deep merge used for the seed: values already in `existing` always win. */
export function mergeDefaults(existing: Content, defaults: Content): Content {
  const out: Content = { ...existing };
  for (const [k, dv] of Object.entries(defaults)) {
    const ev = out[k];
    if (ev === undefined) {
      out[k] = dv;
    } else if (
      ev !== null && typeof ev === 'object' && !Array.isArray(ev) &&
      dv !== null && typeof dv === 'object' && !Array.isArray(dv)
    ) {
      out[k] = mergeDefaults(ev as Content, dv as Content);
    }
  }
  return out;
}
