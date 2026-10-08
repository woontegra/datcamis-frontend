const apiBase = () => process.env.API_URL || "http://127.0.0.1:4010";

/** Photographic stand-ins. A real raster from the media library replaces the slot. */
const slots: { test: (slug: string) => boolean; src: string }[] = [
  { test: (slug) => slug.includes("limon"), src: "/home/product-limon.jpg" },
  { test: (slug) => slug.includes("zeytin"), src: "/home/product-zeytin.jpg" },
  { test: (slug) => slug.includes("badem"), src: "/home/product-badem.jpg" },
];

export function productPhotoSlot(slug: string) {
  return slots.find((slot) => slot.test(slug))?.src || "/home/product-bahce.jpg";
}

export async function displayImage(url: string | undefined, slug: string) {
  const slot = productPhotoSlot(slug);
  const id = url?.match(/media\/([^/]+)\/file/)?.[1];
  if (!id) return slot;
  try {
    const response = await fetch(`${apiBase()}/api/v1/media/${id}/file`, { method: "HEAD", cache: "no-store" });
    const type = response.headers.get("content-type") || "";
    if (response.ok && /^image\/(jpeg|png|webp|avif)/.test(type)) return url;
  } catch {
    return slot;
  }
  return slot;
}
