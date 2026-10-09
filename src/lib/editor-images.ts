import { cleanDeviceOverrides, resolveForDevice, type DeviceOverrides, type EditorDevice } from "@/lib/editor-devices";

export type ImageKind = "photo" | "cover" | "mark";
export type ImageFit = "cover" | "contain";

export type EditorImageStyle = {
  mediaId?: string;
  fit?: ImageFit;
  focusX?: number;
  focusY?: number;
  width?: number;
  height?: number;
  radius?: number;
  borderWidth?: number;
  borderColor?: string;
};

export type EditorImagePatch = EditorImageStyle & DeviceOverrides<EditorImageStyle>;

// The picture, fit and focus are shared; size, corners and border are set per screen.
export const IMAGE_DEVICE_KEYS = ["width", "height", "radius", "borderWidth", "borderColor"] as const satisfies readonly (keyof EditorImageStyle)[];

export type MediaItem = { id: string; filename: string; mimeType: string; alt: string | null; url: string };

const IMAGE_KINDS: [RegExp, ImageKind][] = [
  [/^home\.hero\.photo$/, "photo"],
  [/^home\.(?:collections\.card\.[a-z0-9-]+\.photo|story\.photo|promos\.card\.[a-z0-9-]+\.photo)$/, "cover"],
  [/^frame\.(?:header\.brand\.mark|footer\.brand\.mark|garden\.(?:desktop|mobile))$/, "mark"],
];

export const IMAGE_MIME_TYPES = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"];
const MEDIA_ID = /^[a-z0-9]{20,40}$/;
const HEX = /^#[0-9a-fA-F]{6}$/;

export function imageKind(id: string): ImageKind | null {
  for (const [pattern, kind] of IMAGE_KINDS) if (pattern.test(id)) return kind;
  return null;
}

export function isMediaId(id: string) {
  return MEDIA_ID.test(id);
}

export function mediaUrl(id: string) {
  return `/api/v1/media/${encodeURIComponent(id)}/file`;
}

export function imageTarget(element: HTMLElement) {
  if (element instanceof HTMLImageElement) return element;
  return element.querySelector("img");
}

function clampInt(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, Math.round(value)));
}

export function clampImageNumber(key: keyof EditorImageStyle, value: number) {
  switch (key) {
    case "focusX":
    case "focusY":
      return clampInt(value, 0, 100);
    case "width":
      return clampInt(value, 40, 1600);
    case "height":
      return clampInt(value, 40, 1200);
    case "radius":
      return clampInt(value, 0, 200);
    default:
      return clampInt(value, 0, 12);
  }
}

export function cleanImage(patch: EditorImagePatch, kind: ImageKind): EditorImagePatch {
  const next: EditorImagePatch = {};
  if (patch.mediaId && isMediaId(patch.mediaId)) next.mediaId = patch.mediaId;
  if (kind === "mark") return next;
  if (patch.fit === "cover" || patch.fit === "contain") next.fit = patch.fit;
  if (patch.focusX != null) next.focusX = clampImageNumber("focusX", patch.focusX);
  if (patch.focusY != null) next.focusY = clampImageNumber("focusY", patch.focusY);
  if (kind === "cover") return next;
  Object.assign(next, cleanImageSize(patch), cleanDeviceOverrides<EditorImageStyle>(patch, IMAGE_DEVICE_KEYS, cleanImageSize));
  return next;
}

function cleanImageSize(patch: EditorImageStyle): EditorImageStyle {
  const next: EditorImageStyle = {};
  for (const key of ["width", "height", "radius", "borderWidth"] as const) {
    const value = patch[key];
    if (value != null && Number.isFinite(value)) next[key] = clampImageNumber(key, value);
  }
  if (patch.borderColor && HEX.test(patch.borderColor)) next.borderColor = patch.borderColor;
  return next;
}

function percent(token: string | undefined, fallback: number) {
  if (!token) return fallback;
  if (token === "left" || token === "top") return 0;
  if (token === "right" || token === "bottom") return 100;
  if (token === "center") return 50;
  const value = Number.parseFloat(token);
  return token.endsWith("%") && Number.isFinite(value) ? Math.round(value) : fallback;
}

export function readFocus(image: HTMLImageElement) {
  const [x, y] = getComputedStyle(image).objectPosition.split(/\s+/);
  return { x: percent(x, 50), y: percent(y, 50) };
}

const originalImages = new WeakMap<HTMLImageElement, string | null>();

export function applyImagePatch(element: HTMLElement, raw: EditorImagePatch, kind: ImageKind, device: EditorDevice) {
  const patch = resolveForDevice<EditorImageStyle>(raw, device, IMAGE_DEVICE_KEYS);
  const image = imageTarget(element);
  if (!image) return;
  if (!originalImages.has(image)) originalImages.set(image, image.getAttribute("src"));
  const original = originalImages.get(image) ?? null;

  const src = patch.mediaId && isMediaId(patch.mediaId) ? mediaUrl(patch.mediaId) : original;
  if (src == null) image.removeAttribute("src");
  else if (image.getAttribute("src") !== src) image.setAttribute("src", src);
  if (kind === "mark") return;

  const css = image.style;
  css.objectFit = patch.fit ?? "";
  const focused = patch.focusX != null || patch.focusY != null;
  css.objectPosition = focused ? `${patch.focusX ?? 50}% ${patch.focusY ?? 50}%` : "";
  if (kind === "cover") return;

  css.width = patch.width != null ? `${patch.width}px` : "";
  css.maxWidth = patch.width != null ? "100%" : "";
  css.height = patch.height != null ? `${patch.height}px` : "";
  css.borderRadius = patch.radius != null ? `${patch.radius}px` : "";
  const border = patch.borderWidth;
  css.borderWidth = border ? `${border}px` : "";
  css.borderStyle = border ? "solid" : "";
  css.borderColor = border ? patch.borderColor ?? "#1e4a38" : "";
  css.boxSizing = border ? "border-box" : "";
}
