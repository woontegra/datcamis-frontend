export const PRODUCT_STATUS_LABEL: Record<string, string> = {
  DRAFT: "Taslak",
  ACTIVE: "Yayında",
  DISABLED: "Pasif",
  ARCHIVED: "Arşivlendi",
};

export const PRODUCT_STATUS_FILTERS = [
  { value: "", label: "Arşiv hariç" },
  { value: "DRAFT", label: "Taslak" },
  { value: "ACTIVE", label: "Yayında" },
  { value: "DISABLED", label: "Pasif" },
  { value: "ARCHIVED", label: "Arşivlendi" },
] as const;

export type AdminProductListItem = {
  id: string;
  name: string;
  slug: string;
  status: string;
  variantCount: number;
  priceMin: number;
  priceMax: number;
  totalStock: number;
  stockFlag: "ok" | "low" | "out";
  categoryName: string;
  image: { url: string; alt: string } | null;
  featured: boolean;
};

export type ProductOptionGroup = {
  id: string;
  attributeId: string | null;
  name: string;
  displayType: "BUTTONS" | "SELECT" | "SWATCH";
  values: Array<{ id: string; attributeValueId: string | null; name: string; colorHex: string | null }>;
};

export type AdminProduct = {
  id: string;
  name: string;
  slug: string;
  summary: string;
  description: string;
  content: string;
  usageNotes: string;
  warningNotes: string;
  featured: boolean;
  vatRate: number | null;
  status: string;
  images: { id: string; mediaId: string; alt: string; url: string; sortOrder: number }[];
  variants: {
    id: string;
    sku: string;
    name: string;
    barcode: string | null;
    priceAmount: number;
    compareAtAmount: number | null;
    weightGrams: number | null;
    desi: number | null;
    position: number;
    isDefault: boolean;
    disabled: boolean;
    onHand: number;
    reserved: number;
    lowThreshold: number;
    image: { id: string; url: string; alt: string } | null;
    optionValueIds: string[];
  }[];
  options: ProductOptionGroup[];
  categories: { id: string; slug: string; name: string }[];
  collections: { id: string; slug: string; name: string }[];
  seo: { title: string | null; description: string | null; robotsIndex: boolean; ogMediaId: string | null } | null;
  history: { action: string; text: string; actorName: string; createdAt: string }[];
  permissions: { canEdit: boolean; canPrice: boolean; canStock: boolean; canArchive: boolean };
};

export function suggestSlug(name: string) {
  return name
    .toLocaleLowerCase("tr-TR")
    .replaceAll("ı", "i")
    .replaceAll("ğ", "g")
    .replaceAll("ü", "u")
    .replaceAll("ş", "s")
    .replaceAll("ö", "o")
    .replaceAll("ç", "c")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}
