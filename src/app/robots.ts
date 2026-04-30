import type { MetadataRoute } from "next";

/**
 * robots.txt for crawlers - allows public marketing pages, blocks
 * everything customer/admin-private and the API surface.
 *
 * Next.js generates the actual /robots.txt file at build time from this.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          "/admin/",
          "/auth/",
          "/dashboard/",
          "/settings/",
          "/booking-confirmation/",
          "/_next/",
        ],
      },
    ],
    sitemap: "https://austin-autodetail.com/sitemap.xml",
    host: "https://austin-autodetail.com",
  };
}
