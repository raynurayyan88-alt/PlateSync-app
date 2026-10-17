import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getRestaurantMenu } from "@/lib/menu";
import GuestTableClient from "@/components/guest/GuestTableClient";

interface PageProps {
  params: Promise<{
    slug: string;
    tableNumber: string;
  }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug, tableNumber } = await params;
  const num = parseInt(tableNumber, 10);
  const formattedSlug = slug
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

  return {
    title: `Table ${num} - ${formattedSlug} | TableSync Live Menu`,
    description: `Scan & order collaboratively with your dining party at Table ${num} at ${formattedSlug}. Real-time shared cart, consensus voting, and instant kitchen routing.`,
    alternates: {
      canonical: `/r/${slug}/t/${tableNumber}`,
    },
    openGraph: {
      title: `Table ${num} Menu • ${formattedSlug}`,
      description: `Join Table ${num} at ${formattedSlug} to order dishes together in real time.`,
      url: `/r/${slug}/t/${tableNumber}`,
      type: "website",
    },
  };
}

async function TableContent({ params }: PageProps) {
  const { slug, tableNumber } = await params;
  const num = parseInt(tableNumber, 10);

  if (isNaN(num) || num <= 0) {
    notFound();
  }

  const { restaurant, categories, menuItems } = await getRestaurantMenu(slug);

  return (
    <GuestTableClient
      restaurantSlug={slug}
      restaurantName={restaurant.name}
      tableNumber={num}
      initialMenuItems={menuItems}
      categories={categories}
    />
  );
}

export default function TablePage({ params }: PageProps) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#FAF9F6] flex flex-col items-center justify-center p-4 text-center space-y-3">
          <div className="w-10 h-10 border-2 border-stone-800 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-semibold text-[#1C1917]">Loading PlateSync Table...</p>
        </div>
      }
    >
      <TableContent params={params} />
    </Suspense>
  );
}
