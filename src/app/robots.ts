import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://tablesync.in";

  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/r/"],
        disallow: [
          "/admin",
          "/admin/",
          "/kds",
          "/kds/",
          "/api/",
          "/_next/",
        ],
      },
      {
        userAgent: "Googlebot",
        allow: ["/", "/r/"],
        disallow: ["/admin/", "/kds/", "/api/"],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  };
}
