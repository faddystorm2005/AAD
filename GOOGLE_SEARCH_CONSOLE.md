# Google Search Console setup

Everything Claude can do in code for SEO is shipped. The site has a clean
sitemap, robots.txt, and full structured data. The single remaining step
before Google starts indexing the site is verifying ownership in Search
Console and submitting the sitemap.

This is a one-time, ~5-minute task. Do it once and Google will start
crawling on its own from then on.

---

## Step 1. Open Search Console

Go to https://search.google.com/search-console and sign in with the
Google account that owns the business email (or whichever Google account
will manage SEO long-term).

Click **Add property** in the top-left dropdown.

## Step 2. Pick the right property type

You'll see two choices:

- **Domain** (DNS verification). Covers `austin-autodetail.com` and every
  subdomain (`www.`, `m.`, etc) in one go.
- **URL prefix** (HTML file or meta tag). Covers ONLY the exact URL form
  you enter. If you pick this and verify `https://austin-autodetail.com`,
  the `www.` form is treated as a separate property.

**Pick Domain.** It is one extra step (DNS) but it future-proofs against
any subdomain confusion. Type `austin-autodetail.com` (no `https://`, no
`www.`) and click Continue.

## Step 3. Verify DNS ownership

Google shows you a TXT record like this:

```
google-site-verification=abc123XYZ...
```

You add that record to your DNS in Vercel:

1. Go to https://vercel.com → your AAD project → **Settings** → **Domains**
2. Click the row for `austin-autodetail.com` and find the DNS records section
3. Click **Add** → record type **TXT**, name `@` (or leave blank), value =
   the entire `google-site-verification=...` string from Google
4. Save.

DNS can take 1-15 minutes to propagate. Hit **Verify** in Search Console.
If it fails, wait 5 minutes and try again. Don't delete the TXT record
even after it succeeds; Google re-checks it periodically.

## Step 4. Submit the sitemap

Once verified, in the left sidebar of Search Console click **Sitemaps**.

In the **Add a new sitemap** field, type:

```
sitemap.xml
```

(just the filename, not the full URL — Search Console fills in the
domain). Click Submit.

You should see "Success" within a few seconds. Google will then start
crawling pages listed in `austin-autodetail.com/sitemap.xml`. Currently
that is just the homepage `/`, which is correct: every other page on the
site is gated behind sign-in and has no SEO value.

## Step 5. Request indexing for the homepage

Don't wait for Google to find the homepage on its own. In the **URL
inspection** field at the top, paste:

```
https://austin-autodetail.com/
```

After it loads, click **Request indexing**. Google adds it to the priority
crawl queue, usually indexed within hours.

## Step 6. Check the rich-results preview

While you're in URL inspection, scroll down to **Enhancements**. You
should see entries for:

- Local business
- FAQ
- Sitelinks search box (or just the sitemap link)

If the LocalBusiness schema is recognized, the homepage will eventually
qualify for the local pack and rich-results card. If FAQ schema is
recognized, FAQ answers can appear directly in search results.

If anything is flagged as invalid, the error will say which field. Tell
me the error text and I'll fix it.

---

## What to do later

- **Performance tab** (in Search Console): shows what queries actually
  bring people to the site once Google has crawled it. Check it weekly
  for the first month, then monthly.
- **Coverage tab**: shows pages Google tried to crawl but couldn't. The
  gated pages (`/dashboard`, `/admin`, etc) are excluded by `robots.txt`
  on purpose, so they will appear here as "Excluded by robots.txt" — that
  is correct, not an error.
- **Resubmit the sitemap** after any major content change. Not required,
  but it speeds up re-crawling.

---

## What if I picked URL prefix instead?

If you went with **URL prefix** and verified `https://austin-autodetail.com`,
add a SECOND property for `https://www.austin-autodetail.com` and verify
that too. Otherwise Google may think the `www` form is unverified and
treat it as a different site. Both forms point to the same content via
the canonical tag, but Search Console treats them as separate properties
unless you do Domain verification.

This is exactly the headache Domain verification avoids. If you've already
gone down the URL prefix path, you can switch by adding a Domain property
later.
