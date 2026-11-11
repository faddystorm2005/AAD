// Unit tests for the portal content helpers in src/lib/cmsContent.ts and the
// defaults that feed them.
//
//   npm run test:cms
//
// Node loads the .ts files directly (type stripping), so these run without a
// build and without the network.

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createCopy,
  mergeDefaults,
  readEmail,
  readImage,
  readList,
  readPhone,
  readStringList,
  readText,
} from '../src/lib/cmsContent.ts';
import { SITE_COPY_DEFAULTS } from '../src/lib/siteCopy.ts';
import { CITIES, CITY_COPY_DEFAULTS } from '../src/lib/cityPages.ts';

const DEFAULTS = { ...SITE_COPY_DEFAULTS, cities: CITY_COPY_DEFAULTS };
const CARD_FIELDS = ['title', 'description', 'price_note'];

test('empty content gives every default', () => {
  for (const content of [{}, null, undefined, 'junk', []]) {
    const copy = createCopy(content, DEFAULTS);
    assert.equal(copy.text('hero.eyebrow'), 'Quality Over Quantity');
    assert.equal(copy.text('cities.mesa.h1'), 'Mobile Detailing in Mesa');
    assert.equal(copy.image('hero.photo'), '/images/aad/hero-s-class.jpg');
    assert.deepEqual(copy.list('services.cards', CARD_FIELDS), SITE_COPY_DEFAULTS.services.cards);
    assert.deepEqual(
      copy.strings('pricing_text.includes_interior'),
      SITE_COPY_DEFAULTS.pricing_text.includes_interior,
    );
    assert.deepEqual(copy.phone('contact.alex_phone'), {
      display: '(480) 793-3782',
      href: 'tel:+14807933782',
    });
    assert.deepEqual(copy.email('contact.email'), {
      display: 'info@signaturemobiledetailaz.com',
      href: 'mailto:info@signaturemobiledetailaz.com',
    });
  }
});

test('blank or wrongly typed text falls back', () => {
  assert.equal(readText({ a: '' }, 'a', 'x'), 'x');
  assert.equal(readText({ a: '   ' }, 'a', 'x'), 'x');
  assert.equal(readText({ a: 5 }, 'a', 'x'), 'x');
  assert.equal(readText({ a: { b: 1 } }, 'a.b.c', 'x'), 'x');
  assert.equal(readText({ a: 'Hi\nthere' }, 'a', 'x'), 'Hi\nthere');
});

test('portal text wins and keeps nested keys', () => {
  const copy = createCopy({ hero: { eyebrow: 'New line' }, cities: { tempe: { h1: 'Tempe!' } } }, DEFAULTS);
  assert.equal(copy.text('hero.eyebrow'), 'New line');
  assert.equal(copy.text('hero.intro'), SITE_COPY_DEFAULTS.hero.intro);
  assert.equal(copy.text('cities.tempe.h1'), 'Tempe!');
  assert.equal(copy.text('cities.mesa.h1'), 'Mobile Detailing in Mesa');
});

test('a key with no default throws instead of rendering nothing', () => {
  const copy = createCopy({}, DEFAULTS);
  assert.throws(() => copy.text('hero.nope'), /No default copy/);
});

test('portal list replaces the defaults, in portal order', () => {
  const content = {
    services: {
      cards: [
        { title: 'B', description: 'second', price_note: '' },
        { title: 'A', description: 'first', price_note: 'Quote' },
      ],
    },
  };
  const cards = readList(content, 'services.cards', CARD_FIELDS, SITE_COPY_DEFAULTS.services.cards);
  assert.deepEqual(cards, [
    { title: 'B', description: 'second', price_note: '' },
    { title: 'A', description: 'first', price_note: 'Quote' },
  ]);
});

test('all-empty items are skipped', () => {
  const content = {
    list: [
      { title: '', description: '  ', price_note: '' },
      { title: 'Kept', description: '', price_note: '' },
      {},
      null,
    ],
  };
  assert.deepEqual(readList(content, 'list', CARD_FIELDS, [{ title: 'D' }]), [
    { title: 'Kept', description: '', price_note: '' },
  ]);
});

test('a list of only empty items, or not a list, gives the defaults', () => {
  const defaults = [{ title: 'D', description: 'd', price_note: '' }];
  assert.deepEqual(readList({ list: [{ title: '' }, {}] }, 'list', CARD_FIELDS, defaults), defaults);
  assert.deepEqual(readList({ list: [] }, 'list', CARD_FIELDS, defaults), defaults);
  assert.deepEqual(readList({ list: 'nope' }, 'list', CARD_FIELDS, defaults), defaults);
  assert.deepEqual(readList({ list: { 0: { title: 'x' } } }, 'list', CARD_FIELDS, defaults), defaults);
});

test('a missing item field comes back empty, never undefined', () => {
  const [item] = readList({ list: [{ title: 'Only a title', extra: 'ignored' }] }, 'list', CARD_FIELDS, []);
  assert.deepEqual(item, { title: 'Only a title', description: '', price_note: '' });
  assert.equal(Object.values(item).includes(undefined), false);
  const [weird] = readList({ list: [{ title: 'x', description: { nested: true }, price_note: 12 }] }, 'list', CARD_FIELDS, []);
  assert.deepEqual(weird, { title: 'x', description: '', price_note: '12' });
});

test('existing FAQ shape (q, a) reads as a list', () => {
  const content = { faqs: [{ q: 'Q1', a: 'A1' }, { q: '', a: '' }, { q: 'Q2' }] };
  assert.deepEqual(readList(content, 'faqs', ['q', 'a'], []), [
    { q: 'Q1', a: 'A1' },
    { q: 'Q2', a: '' },
  ]);
});

test('plain line lists accept strings or { value } items and skip blanks', () => {
  assert.deepEqual(readStringList({ l: ['one', '', '  ', 'two'] }, 'l', ['d']), ['one', 'two']);
  assert.deepEqual(readStringList({ l: [{ value: 'one' }, { value: '' }] }, 'l', ['d']), ['one']);
  assert.deepEqual(readStringList({ l: ['', null] }, 'l', ['d']), ['d']);
  assert.deepEqual(readStringList({}, 'l', ['d']), ['d']);
});

test('photos only come from the site or the portal bucket', () => {
  const bucket = 'https://uitwrgxckeckfximxxai.supabase.co/storage/v1/object/public/portal-media/aad/x.jpg';
  assert.equal(readImage({ p: bucket }, 'p', '/d.jpg'), bucket);
  assert.equal(readImage({ p: '/images/aad/1.jpg' }, 'p', '/d.jpg'), '/images/aad/1.jpg');
  assert.equal(readImage({ p: 'https://evil.example.com/x.jpg' }, 'p', '/d.jpg'), '/d.jpg');
  assert.equal(readImage({ p: '//evil.example.com/x.jpg' }, 'p', '/d.jpg'), '/d.jpg');
  assert.equal(readImage({ p: 'javascript:alert(1)' }, 'p', '/d.jpg'), '/d.jpg');
  assert.equal(readImage({ p: '' }, 'p', '/d.jpg'), '/d.jpg');
});

test('phone numbers build a working tel link or fall back', () => {
  assert.deepEqual(readPhone({ p: '480.555.1234' }, 'p', '(480) 793-3782'), {
    display: '480.555.1234',
    href: 'tel:+14805551234',
  });
  assert.deepEqual(readPhone({ p: '+1 (602) 881-5602' }, 'p', '(480) 793-3782'), {
    display: '+1 (602) 881-5602',
    href: 'tel:+16028815602',
  });
  assert.deepEqual(readPhone({ p: 'call me' }, 'p', '(480) 793-3782'), {
    display: '(480) 793-3782',
    href: 'tel:+14807933782',
  });
});

test('email must look like an email', () => {
  assert.equal(readEmail({ e: 'a@b.co' }, 'e', 'x@y.com').href, 'mailto:a@b.co');
  assert.equal(readEmail({ e: 'not an email' }, 'e', 'x@y.com').display, 'x@y.com');
});

test('city defaults come straight from CITIES', () => {
  for (const c of CITIES) {
    const d = CITY_COPY_DEFAULTS[c.slug];
    assert.equal(d.seo_title, c.title);
    assert.equal(d.seo_description, c.description);
    assert.equal(d.intro, c.intro);
    assert.equal(d.hook_heading, `Why ${c.name} Cars Need It`);
    assert.equal(d.areas_label, `Where we go in ${c.name}:`);
  }
});

test('seed merge never changes an existing value', () => {
  const existing = { faqs: [{ q: 'live', a: 'live' }], pricing: { full_suv: '$229' }, hero: { eyebrow: 'Mine' } };
  const merged = mergeDefaults(existing, { faqs: [{ q: 'd' }], hero: { eyebrow: 'Default', intro: 'Default intro' }, cta: { button: 'Go' } });
  assert.deepEqual(merged.faqs, existing.faqs);
  assert.deepEqual(merged.pricing, existing.pricing);
  assert.equal(merged.hero.eyebrow, 'Mine');
  assert.equal(merged.hero.intro, 'Default intro');
  assert.equal(merged.cta.button, 'Go');
});

test('no dash characters in the new default copy', () => {
  const text = JSON.stringify(DEFAULTS);
  assert.equal(/—/.test(text), false, 'em dash in defaults');
});
