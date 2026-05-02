import type { Metadata, Viewport } from "next";
import { Inter, Oswald } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { VehicleProvider } from "@/contexts/VehicleContext";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";
import HapticProvider from "@/components/HapticProvider";
import OfflineBanner from "@/components/OfflineBanner";
import { SpeedInsights } from "@vercel/speed-insights/next";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const oswald = Oswald({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-oswald",
  display: "swap",
});

const SITE_URL = "https://austin-autodetail.com";
const SOCIAL_TITLE = "Mobile Detailing Austin - Austin Auto Detail Services";
// One canonical description used everywhere (page meta, Open Graph, Twitter)
// so search engines and social previews stay consistent. Hits service
// breadth, the mobile-comes-to-you trust signal, and a clear CTA.
const SOCIAL_DESCRIPTION =
  "Austin's premier mobile auto detailing service. Full interior + exterior detailing, ceramic coatings, paint correction, wax, and more - we bring the studio to your driveway. Quality over quantity. Book online in minutes.";

// JSON-LD structured data for local SEO. Google uses this to surface AAD
// in local pack and rich results. Only includes claims that are actually
// true: no fake hours (he's by appointment), no fake reviews, no specific
// street address (mobile business, service area is the city of Austin).
const STRUCTURED_DATA = {
  "@context": "https://schema.org",
  "@type": "AutomotiveBusiness",
  "@id": `${SITE_URL}/#business`,
  name: "Austin Auto Detail",
  description: SOCIAL_DESCRIPTION,
  url: SITE_URL,
  telephone: "+1-480-793-3782",
  email: "info@austin-autodetail.com",
  image: `${SITE_URL}/images/aad/hero-s-class.jpg`,
  priceRange: "$$",
  address: {
    "@type": "PostalAddress",
    addressLocality: "Austin",
    addressRegion: "TX",
    addressCountry: "US",
  },
  areaServed: {
    "@type": "City",
    name: "Austin",
  },
  currenciesAccepted: "USD",
  paymentAccepted: "Cash, Credit Card, PayPal",
  hasOfferCatalog: {
    "@type": "OfferCatalog",
    name: "Detailing Services",
    itemListElement: [
      { "@type": "Offer", itemOffered: { "@type": "Service", name: "Exterior Detail" } },
      { "@type": "Offer", itemOffered: { "@type": "Service", name: "Interior Detail" } },
      { "@type": "Offer", itemOffered: { "@type": "Service", name: "Full Detail" } },
      { "@type": "Offer", itemOffered: { "@type": "Service", name: "Ceramic Coating" } },
      { "@type": "Offer", itemOffered: { "@type": "Service", name: "Paint Correction" } },
      { "@type": "Offer", itemOffered: { "@type": "Service", name: "Headlight Restoration" } },
      { "@type": "Offer", itemOffered: { "@type": "Service", name: "Engine Bay Cleaning" } },
      { "@type": "Offer", itemOffered: { "@type": "Service", name: "Six Month Wax" } },
      { "@type": "Offer", itemOffered: { "@type": "Service", name: "Stain Removal" } },
      { "@type": "Offer", itemOffered: { "@type": "Service", name: "Leather Conditioning" } },
      { "@type": "Offer", itemOffered: { "@type": "Service", name: "Windshield Coating" } },
    ],
  },
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  alternates: {
    canonical: SITE_URL,
  },
  title: {
    default: SOCIAL_TITLE,
    template: "%s · Austin Auto Detail",
  },
  description: SOCIAL_DESCRIPTION,
  applicationName: "AAD",
  keywords: [
    "mobile detailing Austin",
    "Austin auto detail",
    "car detailing Austin TX",
    "ceramic coating Austin",
    "paint correction Austin",
    "mobile car wash Austin",
  ],
  authors: [{ name: "Austin Auto Detail" }],
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "AAD",
  },
  manifest: "/manifest.json",
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    type: "website",
    siteName: "Austin Auto Detail",
    title: SOCIAL_TITLE,
    description: SOCIAL_DESCRIPTION,
    url: SITE_URL,
    locale: "en_US",
    // Next.js auto-includes any /opengraph-image route here.
  },
  twitter: {
    card: "summary_large_image",
    title: SOCIAL_TITLE,
    description: SOCIAL_DESCRIPTION,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export const viewport: Viewport = {
  themeColor: "#000000",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${oswald.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-black text-white">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(STRUCTURED_DATA) }}
        />
        {/* Skip-to-content link - visible only when focused via keyboard.
            Lets screen-reader / keyboard users bypass the sticky header nav
            and jump straight to page content. WCAG 2.4.1 (Bypass Blocks). */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-red-600 focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white focus:shadow-lg"
        >
          Skip to main content
        </a>
        <AuthProvider>
          <VehicleProvider>
            {children}
          </VehicleProvider>
        </AuthProvider>
        <ServiceWorkerRegister />
        <HapticProvider />
        <OfflineBanner />
        <SpeedInsights />
      </body>
    </html>
  );
}
