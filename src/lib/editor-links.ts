import { cleanDeviceOverrides, MIN_DEVICE_FONT, resolveForDevice, type DeviceOverrides, type EditorDevice } from "@/lib/editor-devices";

export type LinkKind = "button" | "link" | "card";

export type EditorLinkStyle = {
  background?: string;
  color?: string;
  fontSize?: number;
  width?: number;
  height?: number;
  borderWidth?: number;
  borderColor?: string;
  radius?: number;
  paddingY?: number;
  paddingX?: number;
  marginTop?: number;
  marginRight?: number;
  marginBottom?: number;
  marginLeft?: number;
};

export type EditorLinkPatch = { text?: string; href?: string } & EditorLinkStyle & DeviceOverrides<EditorLinkStyle>;

// Text, address and colours are shared; size, border and spacing are set per screen.
export const LINK_DEVICE_KEYS = [
  "fontSize",
  "width",
  "height",
  "borderWidth",
  "borderColor",
  "radius",
  "paddingY",
  "paddingX",
  "marginTop",
  "marginRight",
  "marginBottom",
  "marginLeft",
] as const satisfies readonly (keyof EditorLinkStyle)[];

const LINK_KINDS: [RegExp, LinkKind][] = [
  [/^home\.(?:hero|story)\.cta$/, "button"],
  [/^home\.collections\.more$/, "link"],
  [/^home\.(?:collections|promos)\.card\.[a-z0-9-]+$/, "card"],
  [/^frame\.header\.nav\.[a-z0-9-]+$/, "link"],
  [/^frame\.footer\.(?:collections|house)\.(?!title$)[a-z0-9-]+$/, "link"],
];

export function linkKind(id: string): LinkKind | null {
  for (const [pattern, kind] of LINK_KINDS) if (pattern.test(id)) return kind;
  return null;
}

export type HrefCheck = { ok: true; href: string } | { ok: false; message: string };

export function checkHref(raw: string): HrefCheck {
  const href = raw.trim();
  if (!href) return { ok: false, message: "Adres boş olamaz." };
  if (href.length > 300) return { ok: false, message: "Adres çok uzun." };
  if (/[\s\\\u0000-\u001f\u007f]/.test(href)) return { ok: false, message: "Adreste boşluk veya özel karakter olamaz." };
  if (href.startsWith("//")) return { ok: false, message: "Adres / ile başlayan site içi bir yol ya da https:// adresi olmalı." };
  if (href.startsWith("/") || href.startsWith("#")) return { ok: true, href };
  const scheme = href.match(/^([a-z][a-z0-9+.-]*):/i)?.[1].toLowerCase();
  if (!scheme) return { ok: false, message: "Adres / ile başlayan site içi bir yol ya da https:// adresi olmalı." };
  if (scheme === "https") {
    try {
      const url = new URL(href);
      return url.hostname ? { ok: true, href } : { ok: false, message: "Geçerli bir https:// adresi girin." };
    } catch {
      return { ok: false, message: "Geçerli bir https:// adresi girin." };
    }
  }
  if (scheme === "mailto" || scheme === "tel") return { ok: true, href };
  return { ok: false, message: "Bu adres türüne izin verilmiyor. Site içi yol, https://, mailto: veya tel: kullanın." };
}

const HEX = /^#[0-9a-fA-F]{6}$/;

function clampInt(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, Math.round(value)));
}

export function clampLinkNumber(key: keyof EditorLinkStyle, value: number) {
  switch (key) {
    case "fontSize":
      return clampInt(value, 8, 64);
    case "width":
      return clampInt(value, 40, 800);
    case "height":
      return clampInt(value, 20, 200);
    case "borderWidth":
      return clampInt(value, 0, 8);
    case "radius":
      return clampInt(value, 0, 999);
    case "paddingY":
    case "paddingX":
      return clampInt(value, 0, 64);
    default:
      return clampInt(value, 0, 96);
  }
}

const NUMBER_KEYS = [
  "fontSize",
  "width",
  "height",
  "borderWidth",
  "radius",
  "paddingY",
  "paddingX",
  "marginTop",
  "marginRight",
  "marginBottom",
  "marginLeft",
] as const;

export function cleanLink(patch: EditorLinkPatch, kind: LinkKind): EditorLinkPatch {
  const next: EditorLinkPatch = {};
  if (patch.href !== undefined) {
    const checked = checkHref(patch.href);
    if (checked.ok) next.href = checked.href;
  }
  if (kind === "card") return next;
  const text = patch.text?.replace(/\s+/g, " ").trim().slice(0, 120);
  if (text) next.text = text;
  Object.assign(next, cleanLinkStyle(patch));
  Object.assign(next, cleanDeviceOverrides<EditorLinkStyle>(patch, LINK_DEVICE_KEYS, (values) => {
    const style = cleanLinkStyle(values);
    if (style.fontSize != null) style.fontSize = Math.max(MIN_DEVICE_FONT, style.fontSize);
    return style;
  }));
  return next;
}

function cleanLinkStyle(patch: EditorLinkStyle): EditorLinkStyle {
  const next: EditorLinkStyle = {};
  if (patch.background && HEX.test(patch.background)) next.background = patch.background;
  if (patch.color && HEX.test(patch.color)) next.color = patch.color;
  if (patch.borderColor && HEX.test(patch.borderColor)) next.borderColor = patch.borderColor;
  for (const key of NUMBER_KEYS) {
    const value = patch[key];
    if (value != null && Number.isFinite(value)) next[key] = clampLinkNumber(key, value);
  }
  return next;
}

function decorations(element: HTMLElement) {
  return [...element.children].filter((child) => child.getAttribute("aria-hidden") === "true");
}

export function readLinkText(element: HTMLElement) {
  return [...element.childNodes]
    .filter((node) => node.nodeType === Node.TEXT_NODE)
    .map((node) => node.textContent ?? "")
    .join("")
    .replace(/\s+/g, " ")
    .trim();
}

function writeLinkText(element: HTMLElement, text: string) {
  const kept = decorations(element);
  element.replaceChildren(document.createTextNode(kept.length > 0 ? `${text} ` : text), ...kept);
}

type LinkOriginal = { text: string; href: string | null; inline: boolean };
const originalLinks = new WeakMap<HTMLElement, LinkOriginal>();

function px(value: number | undefined) {
  return value == null ? "" : `${value}px`;
}

export function applyLinkPatch(element: HTMLElement, raw: EditorLinkPatch, kind: LinkKind, device: EditorDevice) {
  const patch: EditorLinkPatch = resolveForDevice<EditorLinkPatch>(raw, device, LINK_DEVICE_KEYS);
  if (!originalLinks.has(element)) {
    originalLinks.set(element, {
      text: kind === "card" ? "" : readLinkText(element),
      href: element.getAttribute("href"),
      inline: getComputedStyle(element).display === "inline",
    });
  }
  const original = originalLinks.get(element)!;

  const href = patch.href !== undefined && checkHref(patch.href).ok ? patch.href : original.href;
  if (href == null) element.removeAttribute("href");
  else if (element.getAttribute("href") !== href) element.setAttribute("href", href);
  if (kind === "card") return;

  const text = patch.text ?? original.text;
  if (readLinkText(element) !== text) writeLinkText(element, text);

  const css = element.style;
  css.backgroundColor = patch.background ?? "";
  css.color = patch.color ?? "";
  css.fontSize = px(patch.fontSize);
  const width = patch.width;
  const height = patch.height;
  css.width = px(width);
  css.maxWidth = width == null ? "" : "100%";
  css.height = px(height);
  css.minHeight = height == null ? "" : "0";
  css.display = (width != null || height != null) && original.inline ? "inline-flex" : "";
  css.alignItems = css.display ? "center" : "";
  css.justifyContent = width != null ? "center" : "";
  const borderWidth = patch.borderWidth;
  css.borderWidth = px(borderWidth);
  css.borderStyle = borderWidth ? "solid" : "";
  css.borderColor = patch.borderColor ?? "";
  css.borderRadius = px(patch.radius);
  css.paddingTop = css.paddingBottom = px(patch.paddingY);
  css.paddingLeft = css.paddingRight = px(patch.paddingX);
  css.marginTop = px(patch.marginTop);
  css.marginRight = px(patch.marginRight);
  css.marginBottom = px(patch.marginBottom);
  css.marginLeft = px(patch.marginLeft);
}
