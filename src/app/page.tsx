import type { Metadata } from "next";
import HomePageClient from "@/components/home/HomePageClient";

export const metadata: Metadata = {
  title: "TableSync | Multiplayer QR Menu Software & KDS for Restaurants in India",
  description:
    "Transform your restaurant with TableSync: India's premier multiplayer QR table ordering app and real-time Kitchen Display System (KDS). Group diners order together with live sync, round consensus, and counter cashier billing across Kerala and India.",
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
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "TableSync | Multiplayer QR Menu & Kitchen Display System for Indian Restaurants",
    description:
      "India's leading collaborative QR ordering app & real-time KDS. Group diners add dishes in real time, approve rounds together, and settle bills seamlessly.",
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
};

export default function Page() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://tablesync.in";

  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${baseUrl}/#organization`,
        name: "TableSync India",
        url: baseUrl,
        logo: `${baseUrl}/icon.svg`,
        description:
          "Collaborative real-time QR ordering and Kitchen Display System for Indian restaurants and hotels.",
        address: {
          "@type": "PostalAddress",
          addressCountry: "IN",
          addressRegion: "Kerala",
        },
        contactPoint: {
          "@type": "ContactPoint",
          contactType: "customer support",
          email: "support@tablesync.in",
          areaServed: "IN",
          availableLanguage: ["English", "Hindi", "Malayalam"],
        },
      },
      {
        "@type": "SoftwareApplication",
        "@id": `${baseUrl}/#software`,
        name: "TableSync",
        operatingSystem: "All modern web browsers (iOS Safari, Android Chrome, Windows, macOS)",
        applicationCategory: "BusinessApplication",
        applicationSubCategory: "RestaurantManagementApplication",
        description:
          "Multiplayer QR menu software and real-time Kitchen Display System for restaurants in India. Group diners order together with live cart synchronization, consensus approvals, and counter cashier billing.",
        url: baseUrl,
        author: {
          "@id": `${baseUrl}/#organization`,
        },
        offers: {
          "@type": "AggregateOffer",
          priceCurrency: "INR",
          lowPrice: "0",
          highPrice: "3499",
          offerCount: "4",
          offers: [
            {
              "@type": "Offer",
              name: "Free Demo / Starter",
              price: "0",
              priceCurrency: "INR",
              description: "Free instant demo for single table testing & small cafes",
              availability: "https://schema.org/InStock",
            },
            {
              "@type": "Offer",
              name: "Starter Cafe",
              price: "999",
              priceCurrency: "INR",
              priceSpecification: {
                "@type": "UnitPriceSpecification",
                price: "999",
                priceCurrency: "INR",
                unitText: "MONTH",
              },
              description: "Up to 10 dining tables, unlimited menu items, and print-ready QR table tents",
              availability: "https://schema.org/InStock",
            },
            {
              "@type": "Offer",
              name: "Family Restaurant (Most Popular)",
              price: "1999",
              priceCurrency: "INR",
              priceSpecification: {
                "@type": "UnitPriceSpecification",
                price: "1999",
                priceCurrency: "INR",
                unitText: "MONTH",
              },
              description:
                "Up to 30 dining tables, live audio Kitchen Display System (KDS), multi-round ordering, and priority WhatsApp support",
              availability: "https://schema.org/InStock",
            },
            {
              "@type": "Offer",
              name: "Grand Hotel",
              price: "3499",
              priceCurrency: "INR",
              priceSpecification: {
                "@type": "UnitPriceSpecification",
                price: "3499",
                priceCurrency: "INR",
                unitText: "MONTH",
              },
              description:
                "Unlimited dining tables, multi-counter routing (kitchen, bar, grill), custom branding, and dedicated manager",
              availability: "https://schema.org/InStock",
            },
          ],
        },
        aggregateRating: {
          "@type": "AggregateRating",
          ratingValue: "4.9",
          ratingCount: "148",
          reviewCount: "148",
          bestRating: "5",
          worstRating: "1",
        },
        featureList: [
          "Live multiplayer group table cart",
          "Single QR code per table with zero app install required",
          "Round-by-round consensus voting ('Looks Good!')",
          "Kitchen Display System (KDS) with sound chimes",
          "Multi-round table turnover & counter cashier billing",
          "Offline resilient single-port WebSocket and HTTP sync",
        ],
      },
      {
        "@type": "WebSite",
        "@id": `${baseUrl}/#website`,
        url: baseUrl,
        name: "TableSync",
        description: "Multiplayer QR Menu Software & Kitchen Display System for Indian Restaurants",
        publisher: {
          "@id": `${baseUrl}/#organization`,
        },
        inLanguage: "en-IN",
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <HomePageClient />
    </>
  );
}
