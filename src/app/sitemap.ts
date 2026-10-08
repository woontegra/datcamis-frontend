import type { MetadataRoute } from "next";
import { serverApi } from "@/lib/api";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const site = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3010";
  const staticRoutes = ["", "/urunler", "/koleksiyonlar", "/hikayemiz", "/blog", "/iletisim"].map((path) => ({
    url: `${site}${path || "/"}`,
  }));
  try {
    const body = await serverApi<{ data: { products: string[]; categories: string[]; collections: string[]; pages: string[]; posts: string[] } }>("/seo/paths");
    return [
      ...staticRoutes,
      ...body.data.products.map((slug) => ({ url: `${site}/urunler/${slug}` })),
      ...body.data.categories.map((slug) => ({ url: `${site}/kategoriler/${slug}` })),
      ...body.data.collections.map((slug) => ({ url: `${site}/koleksiyonlar/${slug}` })),
      ...body.data.pages.map((slug) => ({ url: `${site}/sayfa/${slug}` })),
      ...body.data.posts.map((slug) => ({ url: `${site}/blog/${slug}` })),
    ];
  } catch {
    return staticRoutes;
  }
}
