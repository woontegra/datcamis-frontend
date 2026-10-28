import { cache } from "react";
import { ApiError, serverApi } from "./api";
import { EMPTY_SETTINGS, normalizeSettings, type PublicSettings } from "./site-settings";
import { emptyDraft, HOME_EDITOR_SLUG, readHomeEditor, sameEditorDraft, type EditorDraft } from "./editor-elements";
import type { Category, Collection, MenuItem, PageDocument, PostCard, Product, SeoMeta, StoreMenus } from "./types";

const fallbackMenu: MenuItem[] = [
  { label: "Ana Sayfa", href: "/" },
  { label: "Ürünler", href: "/urunler" },
  { label: "Koleksiyonlar", href: "/koleksiyonlar" },
  { label: "Hikayemiz", href: "/hikayemiz" },
  { label: "Blog", href: "/blog" },
  { label: "İletişim", href: "/iletisim" },
];

type MenuSlot = { name: string; items: MenuItem[] } | null;

export async function getMenus(): Promise<StoreMenus> {
  try {
    const body = await serverApi<{ data: Record<"HEADER" | "FOOTER_1" | "FOOTER_2" | "FOOTER_3", MenuSlot> }>("/content/menus");
    const footer = [body.data.FOOTER_1, body.data.FOOTER_2, body.data.FOOTER_3]
      .filter((slot): slot is NonNullable<MenuSlot> => Boolean(slot && slot.items.length))
      .map((slot) => ({ title: slot.name, items: slot.items }));
    return { header: body.data.HEADER ? body.data.HEADER.items : fallbackMenu, footer };
  } catch {
    return { header: fallbackMenu, footer: [] };
  }
}

export const getSettings = cache(async (): Promise<PublicSettings> => {
  try {
    const body = await serverApi<{ data: unknown }>("/settings/public");
    return normalizeSettings(body.data);
  } catch {
    return EMPTY_SETTINGS;
  }
});

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

/** Live homepage overlay. Unpublished or empty editor documents leave the hardcoded storefront as-is. */
export async function getPublishedHome(): Promise<EditorDraft | null> {
  try {
    const page = await getPage(HOME_EDITOR_SLUG);
    const draft = readHomeEditor(page.document);
    if (sameEditorDraft(draft, emptyDraft())) return null;
    return draft;
  } catch {
    return null;
  }
}
