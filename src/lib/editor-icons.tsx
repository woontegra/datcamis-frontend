// Icons are drawn only from these fixed outline paths (24×24, stroke = currentColor); documents store the name.
export const NODE_ICONS = {
  leaf: { label: "Yaprak", paths: ["M5 19c0-8 6-14 14-14 0 8-6 14-14 14Z", "M5 19l8-8"] },
  flower: {
    label: "Çiçek",
    paths: [
      "M10 12a2 2 0 1 0 4 0 2 2 0 1 0-4 0",
      "M12 10C9 10 8 4 12 4s3 6 0 6",
      "M14 12c0-3 6-4 6 0s-6 3-6 0",
      "M12 14c3 0 4 6 0 6s-3-6 0-6",
      "M10 12c0 3-6 4-6 0s6-3 6 0",
    ],
  },
  drop: { label: "Damla", paths: ["M12 3s6 7 6 11a6 6 0 0 1-12 0c0-4 6-11 6-11Z"] },
  star: { label: "Yıldız", paths: ["M12 3l2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.3l-5.5 2.9 1-6.2L3 9.6l6.2-.9Z"] },
  heart: { label: "Kalp", paths: ["M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.5-7 10-7 10Z"] },
  sun: {
    label: "Güneş",
    paths: ["M8 12a4 4 0 1 0 8 0 4 4 0 1 0-8 0", "M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"],
  },
  gift: { label: "Hediye", paths: ["M4 10h16v10H4Z", "M3 7h18v3H3Z", "M12 7v13", "M12 7S10 3 8 4s0 3 4 3", "M12 7s2-4 4-3 0 3-4 3"] },
  wave: { label: "Dalga", paths: ["M2 10c2.5-2 4.5-2 7 0s4.5 2 7 0 4.5-2 6 0", "M2 15c2.5-2 4.5-2 7 0s4.5 2 7 0 4.5-2 6 0"] },
  check: { label: "Onay", paths: ["M5 12.5l5 4.5 9-10"] },
  truck: {
    label: "Kargo",
    paths: ["M2 6h12v10H2Z", "M14 9h4l3 3v4h-7", "M4 17a2 2 0 1 0 4 0 2 2 0 1 0-4 0", "M15 17a2 2 0 1 0 4 0 2 2 0 1 0-4 0"],
  },
  phone: { label: "Telefon", paths: ["M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2Z"] },
  mail: { label: "E-posta", paths: ["M3 6h18v12H3Z", "M3 7l9 6 9-6"] },
  pin: { label: "Konum", paths: ["M12 21s-6-6-6-11a6 6 0 0 1 12 0c0 5-6 11-6 11Z", "M9.5 10a2.5 2.5 0 1 0 5 0 2.5 2.5 0 1 0-5 0"] },
  arrow: { label: "Ok", paths: ["M5 12h14", "M13 6l6 6-6 6"] },
} as const;

export type NodeIcon = keyof typeof NODE_ICONS;

export const NODE_ICON_NAMES = Object.keys(NODE_ICONS) as NodeIcon[];

export function isNodeIcon(name: unknown): name is NodeIcon {
  return typeof name === "string" && Object.prototype.hasOwnProperty.call(NODE_ICONS, name);
}

export function NodeIconSvg({ icon }: { icon: NodeIcon }) {
  return (
    <svg viewBox="0 0 24 24" width="100%" height="100%" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {NODE_ICONS[icon].paths.map((path) => (
        <path key={path} d={path} />
      ))}
    </svg>
  );
}
