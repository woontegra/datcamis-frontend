export type Variant = {
  id: string;
  sku: string;
  name: string;
  priceAmount: number;
  currency: string;
  isDefault: boolean;
  inStock: boolean;
  options: { name: string; value: string }[];
  onHand?: number;
  reserved?: number;
  lowThreshold?: number;
};

export type Product = {
  id: string;
  slug: string;
  name: string;
  summary: string;
  description: string;
  status: string;
  isSeed: boolean;
  images: { id: string; alt: string; url: string }[];
  variants: Variant[];
  categories: { slug: string; name: string }[];
  collections: { slug: string; name: string }[];
  seo?: SeoMeta | null;
};

export type SeoMeta = {
  title?: string | null;
  description?: string | null;
  canonicalPath?: string | null;
  robotsIndex?: boolean;
  robotsFollow?: boolean;
};

export type Collection = { id: string; slug: string; name: string; description: string; seo?: SeoMeta | null };
export type Category = Collection;
export type MenuItem = { label: string; href: string };
export type PostCard = { slug: string; title: string; excerpt: string; publishedAt: string | null; isSeed: boolean };

export type Visibility = { desktop: boolean; tablet: boolean; mobile: boolean };
export type Spacing = { top: number; right: number; bottom: number; left: number };

export type PageBlock = {
  id: string;
  type: string;
  visibility: Visibility;
  spacing: Spacing;
  props: Record<string, unknown>;
};

export type PageSection = {
  id: string;
  visibility: Visibility;
  spacing: Spacing;
  contained: boolean;
  columns: 1 | 2 | 3 | 4;
  blocks: PageBlock[];
};

export type PageDocument = { version: 1; sections: PageSection[] };

export type Dashboard = {
  revenueAmount: number;
  orderCount: number;
  customerCount: number;
  averageOrderAmount: number;
  conversionRate: number | null;
  conversionNote: string;
  salesSeries: { date: string; amount: number }[];
  topProducts: { sku: string; productName: string; quantity: number; totalAmount: number }[];
  lowStock: { sku: string; productName: string; variantName: string; onHand: number; reserved: number; lowThreshold: number; isSeed: boolean }[];
  recentOrders: { number: string; email: string; status: string; totalAmount: number; currency: string; placedAt: string; isSeed: boolean }[];
};
