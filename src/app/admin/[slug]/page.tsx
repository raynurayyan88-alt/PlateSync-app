import { Suspense } from "react";
import type { Metadata } from "next";
import { getRestaurantMenu } from "@/lib/menu";
import AdminPortal from "@/components/admin/AdminPortal";

interface AdminPageProps {
  params: Promise<{
    slug: string;
  }>;
}

export const metadata: Metadata = {
  title: "Admin Portal | PlateSync",
  description: "Manage cuisines, categories, dishes, custom modifier groups, and table QR codes",
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
};

async function AdminContent({ params }: AdminPageProps) {
  const { slug } = await params;
  const { restaurant, categories, menuItems } = await getRestaurantMenu(slug);

  return (
    <AdminPortal
      restaurantSlug={slug}
      initialRestaurant={restaurant}
      initialCategories={categories}
      initialMenuItems={menuItems}
    />
  );
}

export default function AdminPage({ params }: AdminPageProps) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#FAF9F6] flex flex-col items-center justify-center p-4 text-center space-y-3">
          <div className="w-10 h-10 border-2 border-stone-800 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-semibold text-[#1C1917]">Loading PlateSync Admin Portal...</p>
        </div>
      }
    >
      <AdminContent params={params} />
    </Suspense>
  );
}
