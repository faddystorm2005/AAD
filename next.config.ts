import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Photos Alex uploads in the Maus & Co. portal are served from its
  // portal-media bucket. next/image refuses any host not listed here, and
  // src/lib/cmsContent.ts ignores any other photo URL for the same reason.
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "uitwrgxckeckfximxxai.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
    ];
  },
};

export default nextConfig;
