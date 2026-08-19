import type { MetadataRoute } from "next";
import { CITIES } from "@/lib/cityPages";

/**
 * Sitemap for search engines. Only public pages with SEO value.
 *
 * /auth deliberately excluded - it's disallowed by robots.ts (gated
 * sign-in flow, no useful content for crawlers). Listing it here
 * would send a contradictory signal, so it stays out.
 *
 * Everything behind auth (dashboard, admin, settings, booking-
 * confirmation) is also excluded - crawlers can't reach those.
 *
 * Next.js generates the /sitemap.xml file from this at build time.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return [
    {
      url: "https://www.signaturemobiledetailaz.com",
      lastModified,
      changeFrequency: "weekly",
      priority: 1,
    },
    // City landing pages, driven by the same CITIES map as the
    // src/app/[city] route so the sitemap can never miss one.
    ...CITIES.map((c) => ({
      url: `https://www.signaturemobiledetailaz.com/${c.slug}`,
      lastModified,
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
  ];
}
