import type { MetadataRoute } from "next";

/**
 * Sitemap for search engines. Only public pages — anything behind
 * auth (dashboard, admin, settings, etc.) is excluded since crawlers
 * can't reach those anyway and they have no SEO value.
 *
 * Next.js generates the /sitemap.xml file from this at build time.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return [
    {
      url: "https://austin-autodetail.com",
      lastModified,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: "https://austin-autodetail.com/auth",
      lastModified,
      changeFrequency: "yearly",
      priority: 0.4,
    },
  ];
}
