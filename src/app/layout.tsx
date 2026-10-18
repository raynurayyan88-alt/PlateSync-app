import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import ClientHydrationGuard from "@/components/ClientHydrationGuard";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const getBaseUrl = (): URL => {
  const raw = process.env.NEXT_PUBLIC_APP_URL || "https://www.platesync.in";
  // Strip any accidental markdown brackets or spaces
  const clean = raw.replace(/[\[\]\(\)]/g, "").trim();
  try {
    return new URL(clean.startsWith("http") ? clean : `https://${clean}`);
  } catch {
    return new URL("https://www.platesync.in");
  }
};

export const metadata: Metadata = {
  metadataBase: getBaseUrl(),
  title: {
    default: "TableSync | Multiplayer QR Menu Software & KDS for Restaurants in India",
    template: "%s | TableSync",
  },
  description:
    "India's premier multiplayer QR table ordering app & real-time Kitchen Display System (KDS). Shared live carts, consensus approvals, and counter cashier billing for restaurants and hotels across Kerala & India.",
  keywords: [
    "QR menu software India",
    "multiplayer table ordering app",
    "hotel digital menu Kerala & India",
    "kitchen display system for restaurants",
    "restaurant billing software India",
    "contactless dining system India",
    "smart restaurant POS Kerala",
    "collaborative group dining QR",
    "digital restaurant menu card",
    "restaurant table management software",
    "TableSync India",
    "PlateSync",
  ],
  applicationName: "TableSync",
  authors: [{ name: "TableSync India", url: "https://tablesync.in" }],
  creator: "TableSync",
  publisher: "TableSync",
  category: "business",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "TableSync | Multiplayer QR Menu & Kitchen Display System for Indian Restaurants",
    description:
      "Transform your dining room: group diners scan one QR code to build a shared real-time cart, vote on rounds together, and settle bills seamlessly.",
    url: "/",
    siteName: "TableSync India",
    locale: "en_IN",
    type: "website",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "TableSync - Multiplayer QR Menu & Kitchen Display System for Indian Restaurants",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "TableSync | Multiplayer QR Menu & KDS for Restaurants in India",
    description:
      "Multiplayer table ordering app & real-time KDS for restaurants, cafes, and hotels across India.",
    images: ["/opengraph-image"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "TableSync",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
    apple: [{ url: "/icon.svg", type: "image/svg+xml" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#FFFFFF",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="TableSync" />
        <meta name="theme-color" content="#FFFFFF" />
        <link rel="apple-touch-icon" href="/icon.svg" />
        <link rel="icon" type="image/svg+xml" href="/icon.svg" />
      </head>
      <body
        suppressHydrationWarning
        className="min-h-full flex flex-col bg-[#FAF9F6] text-[#1C1917] font-sans antialiased"
      >
        <ClientHydrationGuard>{children}</ClientHydrationGuard>
      </body>
    </html>
  );
}
