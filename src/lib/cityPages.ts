/**
 * Data map for the city landing pages rendered by src/app/[city]/page.tsx.
 * Adding a city here is all it takes: the dynamic route, the sitemap, and
 * generateStaticParams all read from this list. Keep every city's structure
 * identical; the per-city voice lives in `intro` and `hook`.
 */

export const SITE_URL = 'https://www.signaturemobiledetailaz.com';

export type CityPage = {
  /** URL path segment, e.g. "scottsdale" -> /scottsdale */
  slug: string;
  /** Display name used in headings and schema */
  name: string;
  /** <title> (the layout template appends "· Signature Mobile Detailing") */
  title: string;
  /** Meta description */
  description: string;
  /** On-page H1 */
  h1: string;
  /** Hero paragraph under the H1 */
  intro: string;
  /** The local hook: why detailing matters in this specific city */
  hook: string;
  /** Neighborhoods line, rendered after "Where we go in {name}:" */
  areas: string;
};

export const CITIES: CityPage[] = [
  {
    slug: 'scottsdale',
    name: 'Scottsdale',
    title: 'Mobile Detailing in Scottsdale, AZ',
    description:
      'On-site car detailing across Scottsdale. We bring our own water and power to your driveway or office. Owner-operated, six details a day.',
    h1: 'Mobile Detailing in Scottsdale',
    intro:
      'We bring full detailing to you anywhere in Scottsdale, your driveway, your office lot, your garage. We show up with our own water and power, so you do not have to provide anything. You get your time back and your car gets the kind of attention a busy shop cannot give it.',
    hook:
      'Scottsdale sun and road dust are hard on paint and interiors. Between the heat baking your dash and the fine grit that works into every seam, a car here needs more than a drive-through wash. We detail by hand, in the shade of your own garage or a spot in your driveway, from Old Town to North Scottsdale.',
    areas:
      'Old Town, North Scottsdale, McCormick Ranch, Gainey Ranch, DC Ranch, Grayhawk, and the surrounding neighborhoods.',
  },
  {
    slug: 'tempe',
    name: 'Tempe',
    title: 'Mobile Detailing in Tempe, AZ',
    description:
      'On-site car detailing across Tempe. We come to your apartment lot, office, or driveway with our own water and power. Owner-operated.',
    h1: 'Mobile Detailing in Tempe',
    intro:
      'We bring full detailing to you anywhere in Tempe, whether you park at an apartment complex, an office lot, or your own driveway. We arrive with our own water and power, so there is nothing for you to set up. You keep your day and your car gets a real, hand-done detail.',
    hook:
      'Tempe cars work hard. Daily commutes on the 101 and 202, the dust that rolls in off every construction lot, and long days parked in the sun add up fast. Most cars here go far too long between real cleans. We come to you and do it right, so you never have to lose an afternoon at a shop.',
    areas:
      'Downtown Tempe, near ASU, Tempe Marketplace, South Tempe, Warner Ranch, and the surrounding neighborhoods.',
  },
  {
    slug: 'mesa',
    name: 'Mesa',
    title: 'Mobile Detailing in Mesa, AZ',
    description:
      'On-site car detailing across Mesa. Trucks, SUVs, and family cars detailed in your driveway. Own water and power. Owner-operated.',
    h1: 'Mobile Detailing in Mesa',
    intro:
      'We bring full detailing to you anywhere in Mesa, right in your driveway or garage. We show up with our own water and power, so you provide nothing. Big truck, three-row SUV, or daily driver, it gets the same hand-done attention without you ever leaving home.',
    hook:
      'Mesa runs on trucks and family SUVs, and those take a real beating, hauling, hot pavement, kids and dogs in and out all week. A quick wash does not touch that. We handle full interiors, third rows, and truck beds on site, so the whole vehicle actually gets clean, not just the parts you can see.',
    areas:
      'Red Mountain, Las Sendas, Eastmark, Dobson Ranch, Superstition Springs, and the surrounding neighborhoods.',
  },
  {
    slug: 'chandler',
    name: 'Chandler',
    title: 'Mobile Detailing in Chandler, AZ',
    description:
      'On-site car detailing across Chandler. We come to your home or office park with our own water and power. Owner-operated, six details a day.',
    h1: 'Mobile Detailing in Chandler',
    intro:
      'We bring full detailing to you anywhere in Chandler, at your home or right outside your office. We arrive with our own water and power, so there is nothing for you to arrange. Your car gets a real detail while you get on with your day.',
    hook:
      'Plenty of Chandler drivers work long hours in the tech corridor and would rather not give up a Saturday to sit at a detail shop. We fix that by coming to the office park or the driveway. You hand us the keys, we hand them back with the car looking the way it did the day you bought it.',
    areas:
      'Ocotillo, Downtown Chandler, Fulton Ranch, Sun Groves, and the surrounding neighborhoods.',
  },
  {
    slug: 'gilbert',
    name: 'Gilbert',
    title: 'Mobile Detailing in Gilbert, AZ',
    description:
      'On-site car detailing across Gilbert. We detail in your driveway with our own water and power, so you get your weekend back. Owner-operated.',
    h1: 'Mobile Detailing in Gilbert',
    intro:
      'We bring full detailing to you anywhere in Gilbert, right in your own driveway. We show up with our own water and power, so you do not have to provide a thing. Your car gets a full, hand-done detail while you stay home with your weekend intact.',
    hook:
      'Gilbert is family country, and family cars carry everything, sports gear, car seats, the dog, the drive-through lunches. It builds up in ways a quick wash never reaches. We come to the driveway and give the whole car a proper clean, so you are not loading the kids up to sit at a shop on a Saturday.',
    areas:
      'Agritopia, Val Vista Lakes, Power Ranch, Morrison Ranch, Seville, and the surrounding neighborhoods.',
  },
];

export const getCity = (slug: string): CityPage | undefined =>
  CITIES.find((c) => c.slug === slug);
