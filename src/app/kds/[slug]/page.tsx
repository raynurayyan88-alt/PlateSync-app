import { Suspense } from "react";
import type { Metadata } from "next";
import { getRestaurantMenu } from "@/lib/menu";
import KdsDashboard from "@/components/kds/KdsDashboard";

interface PageProps {
  params: Promise<{
    slug: string;
  }>;
}

export const metadata: Metadata = {
  title: "Kitchen Display System | PlateSync",
  description: "Real-time Kitchen Display System for restaurant kitchen staff",
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
};

async function KdsContent({ params }: PageProps) {
  const { slug } = await params;
  const { restaurant } = await getRestaurantMenu(slug);

  return (
    <KdsDashboard
      restaurantSlug={slug}
      restaurantName={restaurant.name}
    />
  );
}

export default function KdsPage({ params }: PageProps) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#FAFAFA] flex flex-col items-center justify-center p-4 text-center space-y-3">
          <div className="w-10 h-10 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-semibold text-[#111827]">Loading Kitchen Display System...</p>
        </div>
      }
    >
      <KdsContent params={params} />
    </Suspense>
  );
}
