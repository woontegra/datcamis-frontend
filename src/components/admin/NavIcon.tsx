import type { NavIcon } from "./nav";

const PATHS: Record<NavIcon, string[]> = {
  home: ["M4 10.5 12 4l8 6.5V20H4Z", "M9 20v-6h6v6"],
  orders: ["M6 4h12v16H6Z", "M9 8h6", "M9 12h6", "M9 16h4"],
  customers: ["M12 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z", "M5 20c1.2-3.2 3.6-5 7-5s5.8 1.8 7 5"],
  products: ["M4 7.5 12 4l8 3.5v9L12 20l-8-3.5Z", "M12 20V11", "M4 7.5l8 3.5 8-3.5"],
  categories: ["M4 4h7v7H4Z", "M13 4h7v7h-7Z", "M4 13h7v7H4Z", "M13 13h7v7h-7Z"],
  collections: ["M5 7h14v12H5Z", "M8 7V5h8v2"],
  variants: ["M7 7h4v4H7Z", "M13 7h4v4h-4Z", "M7 13h4v4H7Z", "M13 13h4v4h-4Z"],
  stock: ["M4 18V8l8-4 8 4v10", "M8 18V10h8v8"],
  campaigns: ["M5 6h9l5 6-5 6H5l3-6Z"],
  coupons: ["M4 8h16v8H4Z", "M12 8v8", "M8.5 12h.01", "M15.5 12h.01"],
  gift: ["M4 10h16v10H4Z", "M3 7h18v3H3Z", "M12 7v13", "M12 7S10 3 8 4s0 3 4 3", "M12 7s2-4 4-3 0 3-4 3"],
  banner: ["M4 6h16v10H4Z", "M8 20h8"],
  popup: ["M6 8h12v10H6Z", "M9 5h6"],
  builder: ["M5 5h6v6H5Z", "M13 5h6v4h-6Z", "M13 11h6v8h-6Z", "M5 13h6v6H5Z"],
  pages: ["M7 4h7l4 4v12H7Z", "M14 4v4h4"],
  content: ["M6 5h12v14H6Z", "M9 9h6", "M9 12h6", "M9 15h4"],
  blog: ["M6 5h12", "M6 9h12", "M6 13h8", "M6 17h10"],
  menus: ["M5 7h14", "M5 12h14", "M5 17h14"],
  media: ["M5 6h14v12H5Z", "M8 14l3-3 2 2 2-2 3 3", "M9 9.5a1 1 0 1 0 0-2 1 1 0 0 0 0 2"],
  design: ["M12 4l3 5 6 .7-4.4 4.2 1.2 5.8L12 17l-5.8 2.7 1.2-5.8L3 9.7 9 9Z"],
  theme: ["M12 4a8 8 0 1 0 8 8", "M12 4v8h8"],
  reports: ["M5 19V9", "M10 19V5", "M15 19v-7", "M20 19V8"],
  seo: ["M11 11a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9Z", "M14.5 14.5 20 20"],
  users: ["M8 10a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z", "M16 11a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z", "M3.5 19c.8-2.6 2.6-4 4.5-4s3.7 1.4 4.5 4", "M13 19c.6-2 2-3.2 3.5-3.2S20 17 20.5 19"],
  integrations: ["M8 8h4v4H8Z", "M14 8h4v4h-4Z", "M8 14h4v4H8Z", "M12 10h2", "M10 12v2"],
  alerts: ["M6 16h12l-1.5-6a4.5 4.5 0 0 0-9 0Z", "M10 19a2 2 0 0 0 4 0"],
  settings: ["M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z", "M12 3.5v2.2M12 18.3V21M4.9 6.5l1.6 1.6M17.5 16l1.6 1.6M3.5 12h2.2M18.3 12H21M4.9 17.5l1.6-1.6M17.5 8l1.6-1.6"],
};

export function NavIcon({ name }: { name: NavIcon }) {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {PATHS[name].map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  );
}
