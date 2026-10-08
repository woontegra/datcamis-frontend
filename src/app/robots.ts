import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const site = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3010";
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/odeme", "/sepet", "/arama"] },
    sitemap: `${site}/sitemap.xml`,
  };
}
