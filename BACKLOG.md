# Austin Auto Detail Backlog

Living document capturing parked work, deferred features, and known issues.
Updated as items get picked up or new items surface.

---

## Real bugs / issues to address

### Frictioncircle branding visible in dashboard `5.jpg`
The Porsche GT3 RS photo at `public/images/aad/5.jpg` (used in dashboard Our Work
section, alt: "Porsche GT3 RS full detail") has visible "Frictioncircle" branding.
That is another detailing brand, either as a watermark or on a worker's uniform
or a sign in the studio. Either way, having a competing brand visible on Alex's
site is a credibility issue. Decide whether to replace with a different licensed
stock photo, or remove from the gallery entirely.

### Wrong alt text on dashboard `15.jpg`
File `15.jpg` is actually a Mercedes S-Class interior, but the alt text in
`src/lib/siteImages.ts` says "Audi R8 ready for detail." Mismatch. Fix the alt
text to match the photo. Hurts accessibility and SEO.

### "Our Work" section in dashboard misrepresents source
The dashboard "Our Work" gallery uses 16 licensed stock photos but is labeled
as if they are AAD's actual work. The 7 photos in the homepage Recent Work
section are correct (those are Alex's real photos). For the dashboard,
either rename the section to something honest like "Detailing Process" or
"What a Detail Looks Like," OR replace the stock photos with Alex's real
work photos as he completes more jobs.

---

## Real features (own session each, not quick fixes)

### Vehicle dropdown with year / make / model auto-size
Replace the current vehicle entry flow with structured year / make / model
dropdowns that auto-detect size category (small / suv / truck). Two paths:
- Use the free NHTSA vPIC API (real-time make/model lookups by year)
- Hand-curated lists from a static JSON file
Auto-size logic needs a mapping table from model to size. Multi-hour project.

### Reschedule approval workflow
Currently customers can self-reschedule. Mirror the existing cancellation
request flow so Alex has to approve reschedules too. Touches: bookings table
schema (add `reschedule_requested_at`, `reschedule_request_payload`), customer
dashboard UI, admin page UI, API routes for request / approve / deny, SMS
notifications. 1 to 2 hours done right.

### Restructure homepage Exterior + Interior into one Full Detail card
Right now homepage shows "Exterior Detailing" and "Interior Detailing" as
separate cards, but the booking flow is sized full-detail packages
(`small / suv / truck`). The mismatch confuses customers. Consolidate into
one "Full Detail" card with size-based pricing matching the booking flow.

### Customer photo upload at booking time
Let customers upload before/after photos with their booking so Alex can
assess condition before approving. Multi-day project. Touches: Supabase
storage bucket setup with RLS policies, schema (booking_photos table or
JSON column), client-side image compression before upload, BookingForm UI,
admin booking detail view, mobile UX.

### First-time customer discount / promo
Need Alex to decide the offer structure first ("$25 off first detail",
"15% off first booking", "free add-on with first detail"). Then implement
in `bookingPricing.ts` and surface on homepage as a value proposition.

### Set up Gmail "Send Mail As" for info@austin-autodetail.com
Currently info@ forwards to austinautodetailingmobile@gmail.com via ImprovMX,
but Alex replies from his gmail address. Set up Gmail's "Send Mail As" so he
can send replies from `info@austin-autodetail.com` and look more professional.
Requires SMTP credentials, ImprovMX free tier may not include this. Worth
checking ImprovMX premium ($9/mo) if it matters.

---

## Performance / diagnostics

### Run Lighthouse audit on production site
We never ran one this session. Customer reports of "stuttering scroll" and
"slow image loading" remain anecdotal. Open Chrome DevTools, Lighthouse tab,
mobile mode, run all categories. Get four scores out of 100 plus the
Opportunities list. Fix the top 3 to 5 opportunities by measured time savings.

### Disable HeroSpotlight cursor-tracking on mobile
The HeroSpotlight component does mousemove tracking, which is wasteful on
touch devices and may cause layout thrashing during scroll. Add a check to
no-op the listener on touch-only devices (or screens under 1024px wide).
Probably the source of "stuttering scroll" reports. Verify with Lighthouse
or Chrome DevTools Performance tab.

### Apt/Suite/Unit could become a proper DB column
Currently appended to address string client-side before submission.
Works for now but a dedicated `unit` text column on bookings would be
cleaner long-term. Migration + API + admin display, all small but real.

---

## Strategic / longer-horizon

### On-page SEO foundation
Not a one-session task. Basics: meta title and description per page,
Open Graph tags, Twitter Card tags, schema.org LocalBusiness structured data
(business hours, address, phone, services, accepted payment methods),
sitemap.xml, robots.txt. Do this before any "rank in search" effort.

### Google Business Profile + reviews
Set up Google Business Profile for Austin Auto Detail. Add real photos,
hours (or "by appointment"), service area. Ask happy customers to leave
reviews on the GBP listing. This drives local Google search ranking
more than anything else. Multi-month effort.

### TikTok and other social media links
Need actual URLs from Alex (TikTok handle, Instagram, etc.). Add to
homepage footer with icon links. 10-minute fix once URLs are in hand.

### Get real customer count + review average from Alex
Replace the placeholder numbers in StatsStrip ("75+ customers", "4.9★ rating",
"3-day max", "100% guarantee") with whatever the real numbers are. Even if
the real number is smaller, real beats inflated.

### Flat button design pass
Per 2026 design trends, the primary "Book Mobile Detailing" button could
look more flat (less shadow, less gradient). Need to see globals.css or
wherever .btn-primary is defined to make a meaningful edit. Subjective
design call.

### "Look better" redesign pass
Vague item from session: translates to "do a design pass" but needs
concrete examples first. Capture screenshots of sites Amber thinks look
better than AAD, identify specific elements (typography? spacing? color
palette? imagery?). Then we have something to work toward.

---

## Cleanup / hygiene

### Vercel DNS records (leftover ImprovMX entries)
Earlier today we added MX/SPF records in Vercel's DNS panel before
realizing the domain is registered through GoDaddy. Those Vercel records
are harmless (not authoritative) but unused. Can be deleted from Vercel
DNS panel anytime for tidiness.

### VIN cropping on future Alex photos
The BMW engine bay photo in the Recent Work gallery had a partial VIN
visible at thumbnail size. Harmless now but flag for future shoots: crop
or blur VINs before posting.

### Service worker version bump cadence
After meaningful deploys, bump the `VERSION` constant in `public/sw.js` to
flush stale clients. Easy to forget. Could be automated as part of
deployment pipeline eventually.
