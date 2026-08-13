import type { Metadata, Viewport } from "next";
import { Inter, Oswald } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { VehicleProvider } from "@/contexts/VehicleContext";
import { DialogProvider } from "@/contexts/DialogContext";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";
import HapticProvider from "@/components/HapticProvider";
import OfflineBanner from "@/components/OfflineBanner";

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

// Canonical site URL. The Vercel domain config serves www as the live
// address and redirects apex -> www, so the canonical must match what the
// customer actually hits in the browser. If the redirect direction is ever
// flipped to www -> apex, change this AND sitemap.ts AND robots.ts in the
// same commit.
//
// Renamed from austin-autodetail.com. That domain must stay registered and
// 301 here: it is what every existing Google result, business listing and
// printed card points at, and a dropped redirect throws all of that away.
//
// The email addresses below deliberately stay on austin-autodetail.com until
// the new domain is verified in Resend. Sending from an unverified domain gets
// rejected or spam-filed, so moving them early breaks review emails rather
// than improving them.
const SITE_URL = "https://www.signaturemobiledetailaz.com";
const SOCIAL_TITLE = "Mobile Car Detailing in Phoenix, AZ | Signature Mobile Detailing";
// One canonical description used everywhere (page meta, Open Graph, Twitter)
// so search engines and social previews stay consistent.
const SOCIAL_DESCRIPTION =
  "Mobile car detailing in Phoenix, Scottsdale, Tempe, Mesa and Chandler. Interior, exterior, ceramic coating and paint correction at your driveway or office.";

const BUSINESS_ID = `${SITE_URL}/#business`;

// Six JSON-LD blocks for local SEO + rich results. Google reads these to
// surface the business in the local pack, FAQ rich result, and Service rich cards.
// Prices match `src/lib/bookingPricing.ts` exactly. FAQ answers must match
// the on-page FAQ copy verbatim (Google flags inconsistencies).
const SCHEMA_LOCAL_BUSINESS = {
  "@context": "https://schema.org",
  "@type": ["LocalBusiness", "AutomotiveBusiness"],
  "@id": BUSINESS_ID,
  name: "Signature Mobile Detailing",
  // "Austin Auto Detail" is the former trading name. Declaring it here is the
  // structured-data way to tell Google "same business, new name", so searches
  // for the old brand still resolve to this listing. It is NOT a location
  // claim - every geo field below says Phoenix, AZ.
  alternateName: ["Signature Detailing Phoenix", "Austin Auto Detail"],
  description:
    "Mobile car detailing serving Phoenix, Scottsdale, Tempe, Mesa, Chandler, Gilbert, Glendale and Peoria, Arizona. We come to your driveway, office, or garage with everything we need, including our own water and power. Interior, exterior, ceramic coatings, and paint correction. Quality over quantity, six details a day max.",
  url: SITE_URL,
  // ONE primary number here on purpose. This is what Google surfaces in the
  // local pack and cross-checks against the Google Business Profile, the
  // TikTok bio, and any directory listing. Two values in this field is how
  // you end up with an inconsistent NAP and a weaker local ranking.
  // Kane's line is a secondary contactPoint below, not a competing primary.
  telephone: "+1-480-793-3782",
  contactPoint: [
    {
      "@type": "ContactPoint",
      contactType: "customer service",
      telephone: "+1-480-793-3782",
      name: "Alex Browning",
      areaServed: "US-AZ",
      availableLanguage: "English",
    },
    {
      "@type": "ContactPoint",
      contactType: "customer service",
      telephone: "+1-602-881-5602",
      name: "Kane Pexa",
      areaServed: "US-AZ",
      availableLanguage: "English",
    },
  ],
  email: "info@austin-autodetail.com",
  // image is the rich-result preview thumbnail. Using the marketing CTA
  // image (1200x630, OG-sized) so Google's local pack and rich results
  // show real work, not just the logo. logo stays as the brand mark.
  image: `${SITE_URL}/images/aad/cta-king-ranch.jpg`,
  logo: `${SITE_URL}/images/aad/logo.png`,
  // Naming the real owners gives Google a person-to-business link, which
  // helps the local pack treat this as a genuine small business.
  founder: [
    { "@type": "Person", name: "Alex Browning" },
    { "@type": "Person", name: "Kane Pexa" },
  ],
  priceRange: "$$",
  currenciesAccepted: "USD",
  paymentAccepted: "Credit Card, Debit Card",
  address: {
    "@type": "PostalAddress",
    addressLocality: "Phoenix",
    addressRegion: "AZ",
    addressCountry: "US",
  },
  geo: {
    "@type": "GeoCoordinates",
    latitude: 33.4484,
    longitude: -112.0740,
  },
  // Service-area business: no storefront to visit, so declare the radius we
  // actually cover. This must match the Google Business Profile service area.
  serviceArea: {
    "@type": "GeoCircle",
    geoMidpoint: {
      "@type": "GeoCoordinates",
      latitude: 33.4484,
      longitude: -112.0740,
    },
    geoRadius: "40000",
  },
  areaServed: [
    "Phoenix",
    "Scottsdale",
    "Tempe",
    "Mesa",
    "Chandler",
    "Gilbert",
    "Glendale",
    "Peoria",
    "Paradise Valley",
    "Ahwatukee",
  ].map((name) => ({
    "@type": "City",
    name,
    containedInPlace: { "@type": "State", name: "Arizona" },
  })),
  openingHoursSpecification: [
    {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: [
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
        "Sunday",
      ],
      opens: "09:00",
      closes: "17:00",
      description: "Outside posted hours, available by appointment.",
    },
  ],
  sameAs: ["https://www.tiktok.com/@signaturedetailingco"],
  knowsAbout: [
    "Mobile Car Detailing",
    "Ceramic Coating",
    "Paint Correction",
    "Interior Detailing",
    "Exterior Detailing",
    "Car Wash",
    "Auto Detailing",
  ],
  slogan: "Quality over quantity. Mobile detailing across the Phoenix valley.",
  makesOffer: [
    {
      "@type": "Offer",
      itemOffered: { "@type": "Service", name: "Full Detail" },
      priceSpecification: {
        "@type": "PriceSpecification",
        minPrice: "199",
        maxPrice: "249",
        priceCurrency: "USD",
      },
    },
    {
      "@type": "Offer",
      itemOffered: { "@type": "Service", name: "Interior Detail" },
      priceSpecification: {
        "@type": "PriceSpecification",
        minPrice: "129",
        maxPrice: "169",
        priceCurrency: "USD",
      },
    },
    {
      "@type": "Offer",
      itemOffered: { "@type": "Service", name: "Exterior Detail" },
      priceSpecification: {
        "@type": "PriceSpecification",
        minPrice: "79",
        maxPrice: "99",
        priceCurrency: "USD",
      },
    },
  ],
};

const SCHEMA_WEBSITE = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": `${SITE_URL}/#website`,
  url: SITE_URL,
  name: "Signature Mobile Detailing",
  description:
    "Mobile car detailing in Phoenix, AZ and the surrounding valley. Quality over quantity, owner-operated, comes to you.",
  publisher: { "@id": BUSINESS_ID },
  inLanguage: "en-US",
};

function serviceSchema(args: {
  id: string;
  serviceType: string;
  name: string;
  description: string;
  prices: { name: string; price: string }[];
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    "@id": `${SITE_URL}/#${args.id}`,
    serviceType: args.serviceType,
    name: args.name,
    description: args.description,
    provider: { "@id": BUSINESS_ID },
    areaServed: { "@type": "City", name: "Phoenix" },
    offers: args.prices.map((p) => ({
      "@type": "Offer",
      name: p.name,
      price: p.price,
      priceCurrency: "USD",
      availability: "https://schema.org/InStock",
    })),
  };
}

const SCHEMA_FULL_DETAIL = serviceSchema({
  id: "service-full-detail",
  serviceType: "Full Auto Detailing",
  name: "Full Detail",
  description:
    "Complete interior and exterior reset. Hand wash, decontamination, and clay bar outside. Vacuum, shampoo, and full surface dressing inside. Best value for the biggest transformation.",
  prices: [
    { name: "Full Detail - Coupe / Sedan", price: "199.00" },
    { name: "Full Detail - SUV", price: "229.00" },
    { name: "Full Detail - Truck or 3-Row", price: "249.00" },
  ],
});

const SCHEMA_INTERIOR_DETAIL = serviceSchema({
  id: "service-interior-detail",
  serviceType: "Interior Auto Detailing",
  name: "Interior Detail",
  description:
    "Vacuum, shampoo carpets and seats, wipe and dress every surface. Cabin completely reset.",
  prices: [
    { name: "Interior Detail - Coupe / Sedan", price: "129.00" },
    { name: "Interior Detail - SUV", price: "149.00" },
    { name: "Interior Detail - Truck or 3-Row", price: "169.00" },
  ],
});

const SCHEMA_EXTERIOR_DETAIL = serviceSchema({
  id: "service-exterior-detail",
  serviceType: "Exterior Auto Detailing",
  name: "Exterior Detail",
  description:
    "Hand wash, decontamination, clay bar, and trim and tire dressing. Your paint reset to like-new.",
  prices: [
    { name: "Exterior Detail - Coupe / Sedan", price: "79.00" },
    { name: "Exterior Detail - SUV", price: "89.00" },
    { name: "Exterior Detail - Truck or 3-Row", price: "99.00" },
  ],
});

// FAQ answers MUST match the on-page FAQ copy exactly. When the FAQ
// section is built (commit 8), keep these in sync.
const SCHEMA_FAQ = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "Where do you offer mobile detailing in Phoenix?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "We service Phoenix, Scottsdale, Tempe, Mesa, Chandler, Gilbert, Glendale, and Peoria. Our detail van is fully self-contained: we bring our own water and power, so all you need is a spot for the vehicle. Driveway, office parking lot, or garage all work.",
      },
    },
    {
      "@type": "Question",
      name: "How long does a typical detail take?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Most interior and exterior details take 2 to 3 hours. Paint correction adds 1 to 2 hours. Ceramic coatings are a full-day job, so we only book one ceramic coating per day at the 9 AM slot.",
      },
    },
    {
      "@type": "Question",
      name: "Do I need to be home during the service?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Not necessarily. As long as we have access to the vehicle and the agreed location, you can be at work or running errands. We'll send updates as we progress.",
      },
    },
    {
      "@type": "Question",
      name: "How does payment work?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "There is no deposit and nothing to pay up front. Send your request, we approve it and text you to lock in a time, and you pay the full amount on-site once the detail is done and you have seen the work.",
      },
    },
    {
      "@type": "Question",
      name: "What's included in a Phoenix car detail?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Our base detail covers a full exterior wash, hand-dry, vacuum, interior wipe-down, window cleaning, and tire dressing. Add-ons cover wax, paint correction, ceramic coating, engine bay cleaning, leather conditioning, stain removal, and windshield treatment.",
      },
    },
    {
      "@type": "Question",
      name: "Can I cancel or reschedule?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. To reschedule, open your booking and pick a new time. You can do that yourself any time before service. To cancel, tap Request Cancellation and add a quick reason. We'll review within 24 hours. Since nothing is paid up front, there is no deposit to refund.",
      },
    },
  ],
};

const ALL_SCHEMAS = [
  SCHEMA_LOCAL_BUSINESS,
  SCHEMA_WEBSITE,
  SCHEMA_FULL_DETAIL,
  SCHEMA_INTERIOR_DETAIL,
  SCHEMA_EXTERIOR_DETAIL,
  SCHEMA_FAQ,
];

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  alternates: {
    canonical: "/",
  },
  title: {
    default: SOCIAL_TITLE,
    template: "%s · Signature Mobile Detailing",
  },
  description: SOCIAL_DESCRIPTION,
  applicationName: "Signature Mobile Detailing",
  keywords: [
    "mobile detailing Phoenix",
    "mobile car detailing Phoenix AZ",
    "Phoenix auto detail",
    "car detailing Phoenix AZ",
    "ceramic coating Phoenix",
    "paint correction Phoenix",
    "mobile car wash Phoenix",
    "mobile detailing Scottsdale",
    "mobile detailing Tempe",
    "mobile detailing Mesa",
    "mobile detailing Chandler",
    "mobile detailing Gilbert",
  ],
  authors: [{ name: "Signature Mobile Detailing" }],
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Signature",
  },
  // Points at the manifest generated by src/app/manifest.ts. The old static
  // public/manifest.json is gone: it declared the 180x180 apple-touch-icon
  // as if it were 192px and 512px, so installed-app icons were upscaled.
  manifest: "/manifest.webmanifest",
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: "/icon", sizes: "192x192", type: "image/png" },
      { url: "/icon1", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-icon", sizes: "180x180", type: "image/png" }],
  },
  openGraph: {
    type: "website",
    siteName: "Signature Mobile Detailing",
    title: SOCIAL_TITLE,
    description: SOCIAL_DESCRIPTION,
    url: SITE_URL + "/",
    locale: "en_US",
    // No explicit images here on purpose. An images array set in metadata
    // overrides the generated opengraph-image.tsx, and the file this used to
    // point at (cta-king-ranch.jpg) is 895x1600 portrait while being declared
    // 1200x630, so every platform cropped it to an unreadable slice.
    // Next.js picks up src/app/opengraph-image.tsx automatically.
  },
  twitter: {
    card: "summary_large_image",
    title: SOCIAL_TITLE,
    description: SOCIAL_DESCRIPTION,
    // Same reason as openGraph above: leaving images unset lets the generated
    // opengraph-image.tsx serve both cards, so they can never drift apart.
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
        {ALL_SCHEMAS.map((schema, i) => (
          <script
            key={i}
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
          />
        ))}
        {/* Skip-to-content link - visible only when focused via keyboard.
            Lets screen-reader / keyboard users bypass the sticky header nav
            and jump straight to page content. WCAG 2.4.1 (Bypass Blocks). */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-gold-600 focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-black focus:shadow-lg"
        >
          Skip to main content
        </a>
        <AuthProvider>
          <VehicleProvider>
            <DialogProvider>
              {children}
            </DialogProvider>
          </VehicleProvider>
        </AuthProvider>
        <ServiceWorkerRegister />
        <HapticProvider />
        <OfflineBanner />
      </body>
    </html>
  );
}
