# Austin Auto Detail Migration Plan

**Repo:** `github.com/faddystorm2005/AAD` (push to `master`)
**Stack:** Next.js 16 + Turbopack, Tailwind v4, Supabase, PayPal v2, Twilio, Resend
**Live site:** `austin-autodetail.com`
**Source of truth for new design:** `homepage-preview.html`

This plan ports everything in the preview into the production codebase, one commit at a time. Each commit must build clean (`npm run build`), deploy green to Vercel (`npx vercel ls`), and pass a quick eyeball test before you move to the next one.

---

## Pre-flight (do this once before commit 1)

1. **Pull latest:** `git checkout master && git pull origin master`
2. **Read the Next.js 16 docs** that apply to anything you're about to change. Run: `ls node_modules/next/dist/docs/` and skim the relevant pages. Next 16 has breaking changes vs older versions, especially around metadata, dynamic imports, and the App Router.
3. **Install Leaflet now** (you'll need it for commit 9): `npm install leaflet @types/leaflet`
4. **Open the preview side-by-side** with the live site so you can copy chunks and visually compare as you go.
5. **Em-dash rule:** zero em-dashes anywhere in any commit. Use periods, commas, colons, "and", "or".

---

## Commit 1: SEO foundation

**What it does:** Adds Schema.org JSON-LD, Open Graph + Twitter Card tags, favicon, canonical URL, theme color, apple-touch-icon. Pure addition, zero UI risk.

**Files to touch:**
- `src/app/layout.tsx` (or wherever the root metadata lives)
- `public/icon.svg` (new file, the favicon)
- `public/apple-touch-icon.png` (use existing logo at `public/images/aad/logo.png`, or create a 180x180 version)

**Schema markup:** copy all 6 JSON-LD blocks from the preview's `<head>` (search for `application/ld+json`). Add them to layout.tsx using the Next.js Script component:

```tsx
import Script from 'next/script';

// In the <head>:
<Script
  id="schema-local-business"
  type="application/ld+json"
  strategy="beforeInteractive"
  dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessSchema) }}
/>
```

Repeat for the other 5 schemas: WebSite, Service Full, Service Interior, Service Exterior, FAQPage.

**OG and Twitter via Next.js Metadata API:**

```tsx
export const metadata: Metadata = {
  title: "Austin Auto Detail. Mobile Detailing in Austin, TX.",
  description: "Professional mobile car detailing in Austin...",
  metadataBase: new URL("https://www.austin-autodetail.com"),
  alternates: { canonical: "/" },
  themeColor: "#d62030",
  openGraph: {
    type: "website",
    siteName: "Austin Auto Detail",
    url: "https://www.austin-autodetail.com/",
    title: "Austin Auto Detail. Mobile Detailing in Austin, TX.",
    description: "Professional mobile car detailing in Austin...",
    images: [{
      url: "/images/aad/cta-king-ranch.jpg",
      width: 1200, height: 630,
      alt: "Ford F-150 King Ranch interior detailed by Austin Auto Detail"
    }],
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Austin Auto Detail. Mobile Detailing in Austin, TX.",
    description: "Professional mobile car detailing...",
    images: ["/images/aad/cta-king-ranch.jpg"],
  },
  icons: {
    icon: "/icon.svg",
    apple: "/apple-touch-icon.png",
  },
};
```

**Verify:**
- `npm run build` passes
- View source on the deployed page, see all 6 schema blocks + OG tags
- Run `https://search.google.com/test/rich-results` against the deployed URL, see at least 4 valid schemas detected
- Share the URL in iMessage to yourself, see the King Ranch preview card

**Push:** `git push origin master`, then `npx vercel ls` to confirm green.

---

## Commit 2: Hero rebuild

**What it does:** Replaces existing hero with the Bentley foam wash version. Adds multi-layer parallax, scroll-tracked motion, mouse spotlight, and the new copy.

**Files:**
- `src/app/page.tsx` (the hero section block)
- `src/app/globals.css` for parallax styles (or component-scoped CSS)

**Copy (verbatim, no em-dashes):**
- Eyebrow: `Quality Over Quantity`
- H1: `Mobile Detailing in Austin`
- Subhead: `Professional detailing brought right to your driveway, office, or garage. We bring everything we need. You don't lift a finger.`

**Hero image path:** `/images/aad/hero-s-class.jpg` is what `siteImages.ts` references via `DASHBOARD_BANNER`. Don't change the path. If Alex wants the Bentley version, he swaps the image file at that path. Same goes for `/images/aad/cta-king-ranch.jpg` for the Book CTA.

**Animation specifics from the preview (preserve exactly):**
- `object-fit: cover`, `object-position: center 55%`
- Scale 1.0 to 1.02 on scroll (subtle, not the original 1.15)
- Multi-layer parallax (3 layers at different speeds)
- IntersectionObserver reveal-on-scroll for the text
- Red mouse-tracked spotlight via `radial-gradient(... at var(--mx) var(--my))`
- Hero veil: 15% / 40% / 88% opacity stops (lighter than original)
- Respects `prefers-reduced-motion`

**Verify:** local hero matches preview side-by-side. Test on a real phone in landscape, should not eat the screen (max-height 600px landscape kicks in).

---

## Commit 3: Stats strip with animated counters

**What it does:** Stats strip directly under hero with 3 animated counters: 90 minutes, 3/day, 100%.

**Files:** `src/app/page.tsx`, CSS

**Markup:**
```tsx
<span className="stat-count" data-target="3">0</span>
<span className="stat-count" data-target="100">0</span>
```

**JS:** copy the IntersectionObserver counter logic from the preview. Wrap in `useEffect` inside a `'use client'` component (it touches the DOM).

**Tone reminder:** the labels are casual (`Minutes Saved Per Detail`, `Cars Max. No Rush Jobs`, `Showroom-Ready, Guaranteed`). Don't sterilize them.

---

## Commit 4: Services & Pricing section

**What it does:** Replaces existing services with the 10-card service grid + 3 tier cards (Full / Interior / Exterior) + add-ons grid + returning-customer banner.

**Files:** `src/app/page.tsx`, possibly a new `Services.tsx` component if page.tsx is getting big.

**Real prices from `src/lib/bookingPricing.ts` (do not invent prices, pull from the source):**
- Exterior: 79 / 89 / 99 (Sedan / SUV / Truck)
- Interior: 129 / 149 / 169
- Full Detail: 199 / 229 / 249
- Deposit: 30
- Returning rate: 10% (auto-applied, no code)
- Add-ons: Wax 50, Engine Bay 25, Stain 30, Leather 10, Pet Hair 25/40/40, Windshield Coating 40, Headlight 80, 1-Step Paint 95, 2-Step 125, Ceramic 500

**Tier card layout:** "Full Detail" tier visually emphasized as the top recommendation (badge: "Most Popular"). Other two tiers slightly de-emphasized.

**Returning customer banner:** placed below the tier cards, full-width, dark with red accent. Copy: "Returning customer? 10% discount applied automatically at checkout. No code needed."

---

## Commit 5: Before/After sliders + Recent Work + TikTok

**What it does:** New "See the Transformation" section with 3 before/after sliders, the existing 16-photo gallery, and the TikTok embed.

**Files:** `src/app/page.tsx`, new `BeforeAfterSlider.tsx` component

**Slider behaviors (from preview):**
- Pointer events for both mouse and touch
- `touch-action: pan-y` so vertical scroll still works while dragging the slider horizontally
- Drag handle with red arrows knob
- 50/50 default split

**TODO (waiting on Alex):** the 3 placeholder sliders use cropped halves of composite photos from his Squarespace site. They look fine but are hacks. When Alex sends real two-photo pairs (4-6 of them, see Alex's task list), swap them in. Mark with `// TODO: replace with real before/after pair from Alex` comments.

**Gallery:** uses the 16 photos already at `/images/aad/1.jpg` through `16.jpg`.

**TikTok:** the embed code is in the preview, copy as-is.

---

## Commit 6: How It Works timeline

**What it does:** Replaces the existing 3-step "How It Works" cards with the timeline (icons + connecting line that fills as steps activate).

**Files:** `src/app/page.tsx`, new `Timeline.tsx` component, CSS

**Icons:** inline SVG, no icon library needed. Three icons: calendar, clipboard-check, van. SVG paths are in the preview HTML.

**Animation:** IntersectionObserver marks each step `is-active` as it enters view. Connector lines fill via CSS `transform: scaleX(1)` (desktop) or `scaleY(1)` (mobile). Line color: red gradient (`var(--accent)` to `var(--accent-2)`).

**Step copy (verbatim, no em-dashes):**
1. Step 1 / Pick a slot / "9 AM, 1 PM, or 5 PM, any day. Real-time availability. No calls, no back-and-forth."
2. Step 2 / We confirm / "Austin Auto Detail reviews your booking within 24 hours. No charge until we approve."
3. Step 3 / We come to you / "On the day of service, our team arrives at your address with everything we need. Our van is fully self-contained: we bring our own water and power. You don't move a thing."

---

## Commit 7: Why Us + Mission

**What it does:** "Why choose us" section: 3 reason cards (Convenience / Quality / Fair Price), the Saturday Back stat block, 3 trust pillar cards, and the founder mission quote.

**Files:** `src/app/page.tsx`

**Mission quote (verbatim, attributed to "Alex, Founder"):**
> "Keep every car looking brand new. The one you drive home in should feel like the one you drove off the lot."

**Trust pillars:** 3 cards (Owner-Operated / Showroom-Ready / $30 Deposit). Do NOT use the 4-pillar Longhorn-borrow version we discussed and abandoned.

**Mouse-tilt effect:** the 3 pillars have a 3D mouse-tilt on hover. Copy the JS from the preview. Respects `prefers-reduced-motion`.

---

## Commit 8: Testimonials marquee + FAQ

**What it does:** Adds horizontal scrolling testimonials (auto-scroll) and the centered FAQ section.

**Files:** `src/app/page.tsx`, possibly new `Marquee.tsx`

**Testimonials data:** 7 real testimonials from production. The em-dashes were already scrubbed from Jen K and Jordan B per your earlier rules.

**Marquee behaviors:**
- Auto-scroll continuous loop (CSS animation)
- Pauses on hover (desktop)
- Pauses on `touchstart`, resumes 1500ms after `touchend` (mobile)
- Two duplicated tracks for seamless loop

**FAQ centering CSS:**
```css
#faq .section-head { text-align: center; }
#faq .h2 { display: inline-block; }
#faq .h2::before { margin-left: auto; margin-right: auto; }
#faq .lede { margin-left: auto; margin-right: auto; }
#faq .faq-list { margin-left: auto; margin-right: auto; }
```

**FAQ copy:** all 6 questions + answers exactly as they appear in current production. Critical that the FAQ on-page copy matches the FAQ JSON-LD schema text exactly (Google flags inconsistencies).

---

## Commit 9: Contact section + Satellite map (Leaflet)

**What it does:** Replaces existing service area display with a real satellite map.

**Files:**
- `src/app/page.tsx`
- New `ServiceMap.tsx` component (`'use client'` required)
- `src/app/globals.css` for map overlay styles

**Critical Next.js gotcha:** Leaflet uses `window` so it cannot SSR. Use dynamic import with `ssr: false`:

```tsx
// In page.tsx (or wherever the map renders)
import dynamic from 'next/dynamic';
const ServiceMap = dynamic(() => import('@/components/ServiceMap'), { ssr: false });
```

**Inside ServiceMap.tsx (`'use client'`):**
- Import Leaflet CSS at top: `import 'leaflet/dist/leaflet.css';`
- Import Leaflet: `import L from 'leaflet';`
- Initialize map in `useEffect`
- Center: `[30.30, -97.78]`, zoom 10
- Disable scroll-wheel zoom
- Tile layer: Esri World Imagery
- Reference labels overlay
- 12 neighborhood markers with custom red pin divIcons
- Pulsing HQ pin for Downtown Austin
- Service area dashed circle (38km radius)
- Call `map.attributionControl.setPrefix('')` to remove the Ukrainian flag

**Production tile licensing:** Esri's free tiles are technically non-commercial. Before deploying with real traffic, switch to one of these (see Alex's task list, he needs to sign up for one):
- ArcGIS Online (free for small businesses, gives proper Esri commercial license)
- MapTiler (free tier 100k tile loads/month, requires API key)
- Mapbox (free tier 50k loads/month, requires API key)

If Alex hasn't signed up at deploy time, leave Esri for now and add a TODO comment to swap.

---

## Commit 10: Hamburger mobile nav drawer

**What it does:** Adds the slide-in mobile navigation drawer.

**Files:**
- New `MobileDrawer.tsx` component (you may already have a `MobileNav` import in `page.tsx`, check whether to update it or replace it)
- Hamburger button added to nav header
- CSS

**Behaviors (all in the preview, copy directly):**
- Hamburger icon morphs to X when open
- Drawer slides in from right (max 360px wide or 85vw)
- Backdrop fades in with blur
- 6 nav links + Book Now CTA + phone number footer
- Closes on: X tap, backdrop tap, link tap, ESC key
- Body scroll-lock when open
- `aria-modal="true"`, `aria-expanded`, `aria-hidden` all wired
- Respects `prefers-reduced-motion`

**Hide the desktop "Book Now" button on mobile** so it doesn't double up with the drawer's CTA + the bottom bar:
```css
@media (max-width: 900px) {
  .nav-right > .btn-primary { display: none; }
}
```

---

## Commit 11: Sticky mobile bottom bar + Polish trio + Mobile fixes

**What it does:** Combines several small additions into one commit since they're all polish-level.

**Files:** `src/app/page.tsx`, possibly new `MobileBottomBar.tsx`, CSS

**Sticky mobile bar:**
- Fixed bottom, full-width on screens <768px
- Two buttons: gray "Call" (links to `tel:+14807933782`), red "Book Now" (links to `#book`)
- Slides up after `scrollY > 600`
- Respects `safe-area-inset-bottom` for iPhones
- Body gets `padding-bottom: 80px` on mobile so footer isn't hidden

**Card hover spotlight:**
- Add `::before` pseudo-element to `.glass-card` and `.tier`
- Radial gradient at `var(--mx) var(--my)` follows cursor
- JS: mousemove listener sets `--mx` / `--my` CSS vars on the card

**Active section nav highlighting:**
- IntersectionObserver with `rootMargin: '-25% 0px -65% 0px'`
- Adds `.is-active` class to matching `.nav-links a` AND `.drawer-nav a`
- Desktop: red underline below link (`bottom: -6px`)
- Mobile drawer: red left border + tinted background

**Mobile fixes:**
- Hero landscape: `@media (max-height: 600px) and (orientation: landscape) { .hero { height: auto; min-height: 380px; padding: 60px 0; } }`
- Add-on rows: `@media (max-width: 480px) { .addon { padding: 16px 18px; } }`
- Service map: `@media (max-width: 560px) { .map-wrap { height: 380px; } }`

---

## Commit 12: Final QA + deploy verification

**What it does:** Pre-launch checklist. No code changes unless something breaks.

**Run through this checklist:**
- [ ] `npm run build` passes locally with zero errors and zero warnings
- [ ] `npm run lint` passes
- [ ] `grep -rP "\xE2\x80\x94" src/` (search for em-dash bytes) returns zero results (em-dash audit)
- [ ] All section IDs in nav links correspond to actual sections (`#services`, `#pricing`, `#work`, `#how-it-works`, `#faq`, `#contact`)
- [ ] FAQ on-page copy matches FAQ JSON-LD schema text exactly
- [ ] Schema validates clean at `https://validator.schema.org/`
- [ ] Rich Results Test passes at `https://search.google.com/test/rich-results` (target: 4+ valid schemas)
- [ ] OG tags preview correctly at `https://www.opengraph.xyz/`
- [ ] iMessage preview shows the King Ranch image when sharing the URL
- [ ] Open the site on a real iPhone in Safari, walk through every section
- [ ] Open on a real Android in Chrome, walk through every section
- [ ] Test landscape orientation on mobile (hero should not eat screen)
- [ ] Test the hamburger menu opens, navigates, and closes correctly
- [ ] Test sticky bottom bar appears after scrolling past hero
- [ ] Test before/after sliders with finger drag
- [ ] Test marquee testimonials pause on touch-and-hold
- [ ] Test reduced motion: enable in OS settings, verify animations stop
- [ ] Click into Leaflet pins, popups should appear with neighborhood names
- [ ] No Ukrainian flag in map attribution corner
- [ ] Service area circle visible
- [ ] Active nav highlight follows your scroll position

**Push and verify deploy:**
```bash
git push origin master
npx vercel ls   # confirm latest deploy is green
```

**Post-deploy:**
- Submit URL to Google Search Console
- Submit sitemap.xml (Next.js can auto-generate via `next-sitemap`)
- Verify the deployed site renders identically to local

---

## Known TODOs (waiting on Alex)

These can ship as-is and be improved later when Alex sends content. Add code comments where placeholders are:

1. **Before/After sliders use cropped composites.** Replace with 4-6 real two-photo pairs when Alex sends them. See `BeforeAfterSlider.tsx` TODO comments.
2. **Meet Alex founder card not built yet.** Needs Alex's headshot. When photo arrives, add a card to the Why Us section or as a new section.
3. **Trust badges row not built yet.** Needs real Google review count + star rating from a verified Google Business Profile.
4. **Schema aggregateRating field omitted.** Add to `localBusinessSchema` once Alex has 5+ verified Google reviews.
5. **Esri tiles in production.** Switch to ArcGIS Online / MapTiler / Mapbox once Alex picks one and sends an API key.
6. **Real images instead of base64 embeds.** The preview uses base64 for 6 before/after halves. Production must use real `/public/images/` files for performance.

---

## Quick reference

- Push to `master` (NOT main)
- Run `npm run build` (NOT just `tsc`) before pushing
- Verify Vercel deploy: `npx vercel ls`
- Em-dash check: `grep -rP "\xE2\x80\x94" src/` (search for em-dash bytes) (must return zero)
- Tone: warm, direct, like Alex talking. Plain English. No corporate marketing speak.
- Older-user accessibility: 16px+ body, py-3+ tap targets, gray-200/300 contrast on dark backgrounds (NEVER gray-400 or 500 for body text)
