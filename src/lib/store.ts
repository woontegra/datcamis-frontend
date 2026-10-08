import { ApiError, serverApi } from "./api";
import type { Category, Collection, MenuItem, PageDocument, PostCard, Product, SeoMeta } from "./types";

const fallbackMenu: MenuItem[] = [
  { label: "Ana Sayfa", href: "/" },
  { label: "Ürünler", href: "/urunler" },
  { label: "Koleksiyonlar", href: "/koleksiyonlar" },
  { label: "Hikayemiz", href: "/hikayemiz" },
  { label: "Blog", href: "/blog" },
  { label: "İletişim", href: "/iletisim" },
];

export async function getMenu() {
  try {
    const body = await serverApi<{ data: { items: MenuItem[] } }>("/content/menus/header");
    return body.data.items.length ? body.data.items : fallbackMenu;
  } catch {
    return fallbackMenu;
  }
}

export async function getSettings() {
  try {
    const body = await serverApi<{ data: Record<string, unknown> }>("/settings/public");
    return body.data;
  } catch {
    return {};
  }
}

export async function getProducts(query = "") {
  const body = await serverApi<{ data: Product[]; meta: { total: number } }>(`/catalog/products${query}`);
  return body;
}

export async function getProduct(slug: string) {
  const body = await serverApi<{ data: Product & { seo?: SeoMeta | null } }>(`/catalog/products/${slug}`);
  return body.data;
}

export async function getCollections() {
  const body = await serverApi<{ data: Collection[] }>("/catalog/collections");
  return body.data;
}

export async function getCollection(slug: string) {
  const body = await serverApi<{ data: Collection }>(`/catalog/collections/${slug}`);
  return body.data;
}

export async function getCategories() {
  const body = await serverApi<{ data: Category[] }>("/catalog/categories");
  return body.data;
}

export async function getCategory(slug: string) {
  const body = await serverApi<{ data: Category }>(`/catalog/categories/${slug}`);
  return body.data;
}

export async function getPosts() {
  const body = await serverApi<{ data: PostCard[] }>("/content/posts");
  return body.data;
}

export async function getPost(slug: string) {
  const body = await serverApi<{ data: PostCard & { body: string; seo?: SeoMeta | null } }>(`/content/posts/${slug}`);
  return body.data;
}

export async function orNotFound<T>(loader: () => Promise<T>): Promise<T | null> {
  try {
    return await loader();
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  }
}

export async function getPage(slug: string) {
  const body = await serverApi<{ data: { slug: string; title: string; document: PageDocument; seo?: SeoMeta | null } }>(`/content/pages/${slug}`);
  return body.data;
}
