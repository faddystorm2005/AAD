import type { Metadata, Viewport } from "next";
import { Inter, Oswald } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { VehicleProvider } from "@/contexts/VehicleContext";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";
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
const SOCIAL_TITLE = "Mobile Detailing Austin — Austin Auto Detail Services";
// One canonical description used everywhere (page meta, Open Graph, Twitter)
// so search engines and social previews stay consistent. Hits service
// breadth, the mobile-comes-to-you trust signal, and a clear CTA.
const SOCIAL_DESCRIPTION =
  "Austin's premier mobile auto detailing service. Full interior + exterior detailing, ceramic coatings, paint correction, wax, and more — we bring the studio to your driveway. Quality over quantity. Book online in minutes.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
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
        {/* Skip-to-content link — visible only when focused via keyboard.
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
        <SpeedInsights />
      </body>
    </html>
  );
}
