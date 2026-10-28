export type StaffRole = "OWNER" | "ADMIN" | "EDITOR" | "ORDER_STAFF";

const ALL: StaffRole[] = ["OWNER", "ADMIN", "EDITOR", "ORDER_STAFF"];
const SALES: StaffRole[] = ["OWNER", "ADMIN", "ORDER_STAFF"];
const CONTENT: StaffRole[] = ["OWNER", "ADMIN", "EDITOR"];
const MANAGE: StaffRole[] = ["OWNER", "ADMIN"];

export type NavIcon =
  | "home"
  | "orders"
  | "customers"
  | "products"
  | "categories"
  | "collections"
  | "variants"
  | "stock"
  | "campaigns"
  | "coupons"
  | "gift"
  | "banner"
  | "popup"
  | "builder"
  | "pages"
  | "content"
  | "blog"
  | "menus"
  | "media"
  | "design"
  | "theme"
  | "reports"
  | "seo"
  | "users"
  | "integrations"
  | "alerts"
  | "settings";

export type AdminNavItem = {
  label: string;
  href: string;
  icon: NavIcon;
  roles: StaffRole[];
};

export type AdminNavGroup = {
  id: string;
  label: string;
  items: AdminNavItem[];
};

export const adminNavGroups: AdminNavGroup[] = [
  {
    id: "genel",
    label: "Genel",
    items: [{ label: "Dashboard", href: "/admin", icon: "home", roles: ALL }],
  },
  {
    id: "satis",
    label: "Satış",
    items: [
      { label: "Siparişler", href: "/admin/siparisler", icon: "orders", roles: SALES },
      { label: "Müşteriler", href: "/admin/musteriler", icon: "customers", roles: SALES },
    ],
  },
  {
    id: "katalog",
    label: "Katalog",
    items: [
      { label: "Ürünler", href: "/admin/urunler", icon: "products", roles: ALL },
      { label: "Kategoriler", href: "/admin/kategoriler", icon: "categories", roles: ALL },
      { label: "Koleksiyonlar", href: "/admin/koleksiyonlar", icon: "collections", roles: ALL },
      { label: "Varyantlar", href: "/admin/varyantlar", icon: "variants", roles: ALL },
      { label: "Stok", href: "/admin/stok", icon: "stock", roles: ALL },
    ],
  },
  {
    id: "pazarlama",
    label: "Pazarlama",
    items: [
      { label: "Kampanyalar", href: "/admin/kampanyalar", icon: "campaigns", roles: ALL },
      { label: "Kupon Kodları", href: "/admin/kuponlar", icon: "coupons", roles: ALL },
      { label: "Hediye/Paket", href: "/admin/hediye", icon: "gift", roles: ALL },
      { label: "Banner/Slider", href: "/admin/banner", icon: "banner", roles: ALL },
      { label: "Popup", href: "/admin/popup", icon: "popup", roles: ALL },
    ],
  },
  {
    id: "icerik",
    label: "İçerik ve Tasarım",
    items: [
      { label: "Page Builder", href: "/admin/page-builder", icon: "builder", roles: CONTENT },
      { label: "Sayfalar", href: "/admin/sayfalar", icon: "pages", roles: CONTENT },
      { label: "İçerik Yönetimi", href: "/admin/icerik", icon: "content", roles: ALL },
      { label: "Blog", href: "/admin/blog", icon: "blog", roles: ALL },
      { label: "Menüler", href: "/admin/menuler", icon: "menus", roles: ALL },
      { label: "Medya Kütüphanesi", href: "/admin/medya", icon: "media", roles: CONTENT },
      { label: "Tasarım", href: "/admin/tasarim", icon: "design", roles: ALL },
      { label: "Tema Ayarları", href: "/admin/tema", icon: "theme", roles: ALL },
    ],
  },
  {
    id: "analiz",
    label: "Analiz",
    items: [
      { label: "Raporlar", href: "/admin/raporlar", icon: "reports", roles: ALL },
      { label: "SEO", href: "/admin/seo", icon: "seo", roles: ALL },
    ],
  },
  {
    id: "sistem",
    label: "Sistem",
    items: [
      { label: "Kullanıcı Yönetimi", href: "/admin/kullanicilar", icon: "users", roles: MANAGE },
      { label: "Entegrasyonlar", href: "/admin/entegrasyonlar", icon: "integrations", roles: ALL },
      { label: "Bildirimler", href: "/admin/bildirimler", icon: "alerts", roles: ALL },
      { label: "Ayarlar", href: "/admin/ayarlar", icon: "settings", roles: ALL },
    ],
  },
];

export function navItemActive(pathname: string, href: string) {
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function visibleNavGroups(role: StaffRole | null) {
  if (!role) return [];
  return adminNavGroups
    .map((group) => ({ ...group, items: group.items.filter((item) => item.roles.includes(role)) }))
    .filter((group) => group.items.length > 0);
}

export function groupIdForPath(pathname: string, groups: AdminNavGroup[]) {
  return groups.find((group) => group.items.some((item) => navItemActive(pathname, item.href)))?.id ?? groups[0]?.id;
}
