import type { Metadata, Viewport } from "next";
import { Inter, Oswald } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { VehicleProvider } from "@/contexts/VehicleContext";
import { DialogProvider } from "@/contexts/DialogContext";
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

const SITE_URL = "https://www.austin-autodetail.com";
const SOCIAL_TITLE = "Austin Auto Detail. Mobile Detailing in Austin, TX.";
// One canonical description used everywhere (page meta, Open Graph, Twitter)
// so search engines and social previews stay consistent.
const SOCIAL_DESCRIPTION =
  "Professional mobile car detailing in Austin. Interior, exterior, ceramic coatings, and paint correction. We bring everything to your driveway, office, or garage. Quality over quantity.";

const BUSINESS_ID = `${SITE_URL}/#business`;

// Six JSON-LD blocks for local SEO + rich results. Google reads these to
// surface AAD in the local pack, FAQ rich result, and Service rich cards.
// Prices match `src/lib/bookingPricing.ts` exactly. FAQ answers must match
// the on-page FAQ copy verbatim (Google flags inconsistencies).
const SCHEMA_LOCAL_BUSINESS = {
  "@context": "https://schema.org",
  "@type": ["LocalBusiness", "AutomotiveBusiness"],
  "@id": BUSINESS_ID,
  name: "Austin Auto Detail",
  alternateName: "AAD",
  description:
    "Professional mobile car detailing service in Austin, Texas. We come to your driveway, office, or garage with everything we need. Interior, exterior, ceramic coatings, and paint correction. Quality over quantity, three details a day max.",
  url: SITE_URL,
  telephone: "+1-480-793-3782",
  email: "info@austin-autodetail.com",
  image: `${SITE_URL}/images/aad/logo.png`,
  logo: `${SITE_URL}/images/aad/logo.png`,
  priceRange: "$$",
  currenciesAccepted: "USD",
  paymentAccepted: "Credit Card, Debit Card",
  address: {
    "@type": "PostalAddress",
    addressLocality: "Austin",
    addressRegion: "TX",
    addressCountry: "US",
  },
  geo: {
    "@type": "GeoCoordinates",
    latitude: 30.2672,
    longitude: -97.7431,
  },
  areaServed: [
    "Austin",
    "Round Rock",
    "Cedar Park",
    "Georgetown",
    "Pflugerville",
    "Lakeway",
    "West Lake Hills",
    "Buda",
    "Kyle",
    "Dripping Springs",
  ].map((name) => ({
    "@type": "City",
    name,
    containedInPlace: { "@type": "State", name: "Texas" },
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
  sameAs: ["https://www.tiktok.com/@austinautodetail"],
  knowsAbout: [
    "Mobile Car Detailing",
    "Ceramic Coating",
    "Paint Correction",
    "Interior Detailing",
    "Exterior Detailing",
    "Car Wash",
    "Auto Detailing",
  ],
  slogan: "Quality over quantity. Mobile detailing in Austin.",
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
  name: "Austin Auto Detail",
  description:
    "Mobile car detailing in Austin, TX. Quality over quantity, owner-operated, comes to you.",
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
    areaServed: { "@type": "City", name: "Austin" },
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
      name: "Where do you offer mobile detailing in Austin?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "We service Austin and surrounding areas. Our detail van is fully self-contained: we bring our own water and power, so all you need is a spot for the vehicle. Driveway, office parking lot, or garage all work.",
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
        text: "After we approve your booking, you pay a $30 deposit online to lock in your slot. The remaining balance is due on-site after the service is complete.",
      },
    },
    {
      "@type": "Question",
      name: "What's included in Austin car cleaning?",
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
        text: "Yes. To reschedule, open your booking and pick a new time. You can do that yourself any time before service. To cancel, tap Request Cancellation and add a quick reason. We'll review within 24 hours. Once approved, your $30 deposit becomes account credit toward a future booking.",
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
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
    apple: [{ url: "/apple-touch-icon.png" }],
  },
  openGraph: {
    type: "website",
    siteName: "Austin Auto Detail",
    title: SOCIAL_TITLE,
    description: SOCIAL_DESCRIPTION,
    url: SITE_URL + "/",
    locale: "en_US",
    images: [
      {
        url: "/images/aad/cta-king-ranch.jpg",
        width: 1200,
        height: 630,
        alt: "Ford F-150 King Ranch interior detailed by Austin Auto Detail",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: SOCIAL_TITLE,
    description: SOCIAL_DESCRIPTION,
    images: ["/images/aad/cta-king-ranch.jpg"],
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
  themeColor: "#d62030",
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
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-red-600 focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white focus:shadow-lg"
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
        <SpeedInsights />
      </body>
    </html>
  );
}
