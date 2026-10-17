import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://tablesync.in";
  const now = new Date();

  const standardRoutes: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: now,
      changeFrequency: "daily",
      priority: 1.0,
    },
    {
      url: `${baseUrl}/r/grand-empire/t/5`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/r/malabar-treats/t/1`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
    },
  ];

  try {
    // Fast-fail DB check within 100ms to guarantee zero build delays on Vercel / Render
    const restaurants = await Promise.race([
      prisma.restaurant.findMany({
        select: { slug: true, createdAt: true },
        take: 50,
      }),
      new Promise<Array<{ slug: string; createdAt: Date }>>((_, reject) =>
        setTimeout(() => reject(new Error("DB timeout")), 100)
      ),
    ]);

    const dynamicRoutes: MetadataRoute.Sitemap = restaurants
      .filter((r) => r.slug !== "grand-empire" && r.slug !== "malabar-treats")
      .map((r) => ({
        url: `${baseUrl}/r/${r.slug}/t/1`,
        lastModified: r.createdAt || now,
        changeFrequency: "weekly" as const,
        priority: 0.7,
      }));

    return [...standardRoutes, ...dynamicRoutes];
  } catch {
    return standardRoutes;
  }
}
