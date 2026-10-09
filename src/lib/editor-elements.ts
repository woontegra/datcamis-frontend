import { boxKind, cleanBoxStyle, type EditorBoxStyle } from "@/lib/editor-boxes";
import { cleanImage, imageKind, type EditorImagePatch } from "@/lib/editor-images";
import { cleanLink, linkKind, type EditorLinkPatch } from "@/lib/editor-links";
import { cleanNodes, layersToNodes, type EditorNode, type LegacyTextLayer } from "@/lib/editor-nodes";
import { cleanDeviceOverrides, MIN_DEVICE_FONT, resolveForDevice, type DeviceOverrides, type EditorDevice } from "@/lib/editor-devices";

export type { EditorDevice } from "@/lib/editor-devices";

function isCollectionCard(id: string) {
  return /^home\.collections\.card\.[a-z0-9-]+$/.test(id);
}

export function parsePx(raw: string) {
  const match = raw.trim().match(/^-?\d+/);
  if (!match) return null;
  return Number(match[0]);
}

export function parseDecimal(raw: string) {
  const match = raw.trim().replace(",", ".").match(/^-?\d+(\.\d+)?/);
  if (!match) return null;
  return Number(match[0]);
}

export type CopyAlign = "left" | "center" | "right";
export type CopyFont = "display" | "sans" | "script";
export type CopyWeight = 400 | 500 | 600 | 700;
export type CopyWidth = { value: number; unit: "px" | "%" };

export type EditorTextStyle = {
  fontFamily?: CopyFont;
  fontWeight?: CopyWeight;
  fontSize?: number;
  color?: string;
  align?: CopyAlign;
  lineHeight?: number;
  letterSpacing?: number;
  spaceTop?: number;
  spaceBottom?: number;
  width?: CopyWidth;
};

export type EditorCopyPatch = { text?: string } & EditorTextStyle & DeviceOverrides<EditorTextStyle>;

// Text and colour are shared; everything else is set per screen.
export const COPY_DEVICE_KEYS = ["fontFamily", "fontWeight", "fontSize", "align", "lineHeight", "letterSpacing", "spaceTop", "spaceBottom", "width"] as const satisfies readonly (keyof EditorTextStyle)[];

export const COPY_FONTS: Record<CopyFont, { label: string; stack: string }> = {
  display: { label: "Başlık (serif)", stack: "var(--font-display), \"Times New Roman\", serif" },
  sans: { label: "Sade", stack: "var(--font-sans), \"Segoe UI\", sans-serif" },
  script: { label: "El yazısı", stack: "var(--font-script, cursive), cursive" },
};

export const COPY_WEIGHTS: { value: CopyWeight; label: string }[] = [
  { value: 400, label: "Normal" },
  { value: 500, label: "Orta" },
  { value: 600, label: "Yarı kalın" },
  { value: 700, label: "Kalın" },
];

const EDITABLE_TEXT = new RegExp(
  "^(?:home\\.(?:hero\\.(?:kicker|title|text|script)" +
    "|features\\.(?:natural|lasting|place|gift)\\.text" +
    "|collections\\.(?:title|card\\.[a-z0-9-]+\\.(?:title|kicker|action))" +
    "|products\\.(?:kicker|title|text)" +
    "|story\\.(?:title|text|script)" +
    "|promos\\.card\\.[a-z0-9-]+\\.(?:title|text|action))" +
    "|frame\\.(?:header\\.brand\\.(?:name|tag)" +
    "|footer\\.(?:brand\\.(?:name|tag|text)|(?:collections|house)\\.title|newsletter\\.(?:kicker|title|text))))$",
);

export function isEditableCopy(id: string) {
  return EDITABLE_TEXT.test(id);
}

export function clampFontSize(value: number) {
  return Math.min(120, Math.max(8, Math.round(value)));
}

export function clampLineHeight(value: number) {
  return Math.min(3, Math.max(0.8, Math.round(value * 100) / 100));
}

export function clampLetterSpacing(value: number) {
  return Math.min(20, Math.max(-5, Math.round(value * 10) / 10));
}

export function clampSpace(value: number) {
  return Math.min(48, Math.max(0, Math.round(value)));
}

export function clampCopyWidth(value: number, unit: CopyWidth["unit"]): CopyWidth {
  if (unit === "%") return { value: Math.min(100, Math.max(20, Math.round(value))), unit };
  return { value: Math.min(1200, Math.max(80, Math.round(value))), unit: "px" };
}

export function copyWidthFromPx(px: number, unit: CopyWidth["unit"], element: HTMLElement) {
  const host = element.parentElement?.clientWidth || px;
  return unit === "%" ? clampCopyWidth((px / host) * 100, "%") : clampCopyWidth(px, "px");
}

export function readElementCopy(element: HTMLElement) {
  const lines = [""];
  const visit = (node: Node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      lines[lines.length - 1] += (node.textContent ?? "").replace(/\s+/g, " ");
      return;
    }
    if (!(node instanceof Element)) return;
    if (node.tagName === "BR") {
      lines.push("");
      return;
    }
    node.childNodes.forEach(visit);
  };
  element.childNodes.forEach(visit);
  return lines.map((line) => line.trim()).join("\n").trim();
}

export function writeElementCopy(element: HTMLElement, text: string) {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const fragment = document.createDocumentFragment();
  lines.forEach((line, index) => {
    if (index > 0) fragment.appendChild(document.createElement("br"));
    fragment.appendChild(document.createTextNode(line));
  });
  element.replaceChildren(fragment);
}

export function resolveTextStyle(patch: EditorCopyPatch, device: EditorDevice): EditorTextStyle {
  return resolveForDevice<EditorTextStyle>(patch, device, COPY_DEVICE_KEYS);
}

const originalCopies = new WeakMap<HTMLElement, string>();

export function applyCopyPatch(element: HTMLElement, patch: EditorCopyPatch, device: EditorDevice) {
  if (!originalCopies.has(element)) originalCopies.set(element, readElementCopy(element));
  const text = patch.text ?? originalCopies.get(element) ?? "";
  if (readElementCopy(element) !== text) writeElementCopy(element, text);

  const style = resolveTextStyle(patch, device);
  const css = element.style;
  css.color = style.color ?? "";
  css.fontFamily = style.fontFamily ? COPY_FONTS[style.fontFamily].stack : "";
  css.fontWeight = style.fontWeight ? String(style.fontWeight) : "";
  css.fontSize = style.fontSize == null ? "" : `${style.fontSize}px`;
  css.textAlign = style.align ?? "";
  css.lineHeight = style.lineHeight == null ? "" : String(style.lineHeight);
  css.letterSpacing = style.letterSpacing == null ? "" : `${style.letterSpacing}px`;
  css.marginTop = style.spaceTop == null ? "" : `${style.spaceTop}px`;
  css.marginBottom = style.spaceBottom == null ? "" : `${style.spaceBottom}px`;

  const wide = style.width?.unit === "px";
  const desktop = device === "desktop";
  const freed = desktop ? patch.text !== undefined || style.width != null || style.align != null : style.width != null;
  css.position = wide ? "relative" : "";
  css.zIndex = wide ? "2" : "";
  css.width = style.width ? `${style.width.value}${style.width.unit}` : "";
  // Narrow screens never let a fixed width push text past its column.
  css.maxWidth = !freed ? "" : !desktop || style.width?.unit === "%" ? "100%" : "none";
}

function cleanCopy(patch: EditorCopyPatch): EditorCopyPatch {
  const next: EditorCopyPatch = { ...cleanTextStyle(patch), ...cleanDeviceOverrides<EditorTextStyle>(patch, COPY_DEVICE_KEYS, (values) => {
    const style = cleanTextStyle(values);
    if (style.fontSize != null) style.fontSize = Math.max(MIN_DEVICE_FONT, style.fontSize);
    return style;
  }) };
  if (patch.text !== undefined) next.text = patch.text;
  return next;
}

function cleanTextStyle(patch: EditorTextStyle): EditorTextStyle {
  const next: EditorTextStyle = {};
  if (patch.fontFamily && patch.fontFamily in COPY_FONTS) next.fontFamily = patch.fontFamily;
  if (patch.fontWeight && COPY_WEIGHTS.some((item) => item.value === patch.fontWeight)) next.fontWeight = patch.fontWeight;
  if (patch.fontSize != null) next.fontSize = clampFontSize(patch.fontSize);
  if (patch.color) next.color = patch.color;
  if (patch.align) next.align = patch.align;
  if (patch.lineHeight != null) next.lineHeight = clampLineHeight(patch.lineHeight);
  if (patch.letterSpacing != null) next.letterSpacing = clampLetterSpacing(patch.letterSpacing);
  if (patch.spaceTop != null) next.spaceTop = clampSpace(patch.spaceTop);
  if (patch.spaceBottom != null) next.spaceBottom = clampSpace(patch.spaceBottom);
  if (patch.width) next.width = clampCopyWidth(patch.width.value, patch.width.unit);
  return next;
}

export const HOME_EDITOR_SLUG = "ana-sayfa";

export type EditorDraft = {
  copies: Record<string, EditorCopyPatch>;
  nodes: EditorNode[];
  links: Record<string, EditorLinkPatch>;
  images: Record<string, EditorImagePatch>;
  boxes: Record<string, EditorBoxStyle>;
};

export const emptyDraft = (): EditorDraft => ({ copies: {}, nodes: [], links: {}, images: {}, boxes: {} });

export function homeEditorDocument({ copies, nodes, links, images, boxes }: EditorDraft) {
  const cleanCopies: Record<string, EditorCopyPatch> = {};
  for (const [id, patch] of Object.entries(copies)) {
    if (!isEditableCopy(id)) continue;
    const next = cleanCopy(patch);
    if (Object.keys(next).length > 0) cleanCopies[id] = next;
  }
  const cleanLinks: Record<string, EditorLinkPatch> = {};
  for (const [id, patch] of Object.entries(links)) {
    const kind = linkKind(id);
    if (!kind) continue;
    const next = cleanLink(patch, kind);
    if (Object.keys(next).length > 0) cleanLinks[id] = next;
  }
  const cleanImages: Record<string, EditorImagePatch> = {};
  for (const [id, patch] of Object.entries(images)) {
    const kind = imageKind(id);
    if (!kind) continue;
    const next = cleanImage(patch, kind);
    if (Object.keys(next).length > 0) cleanImages[id] = next;
  }
  const cleanBoxes: Record<string, EditorBoxStyle> = {};
  for (const [id, patch] of Object.entries(boxes)) {
    if (!boxKind(id)) continue;
    const next = cleanBoxStyle(patch);
    if (Object.keys(next).length > 0) cleanBoxes[id] = next;
  }
  const cleanNodeList = cleanNodes(nodes);
  return {
    version: 2 as const,
    sections: [] as [],
    editor: {
      target: "home" as const,
      copies: cleanCopies,
      layers: [] as LegacyTextLayer[],
      ...(cleanNodeList.length > 0 ? { nodes: cleanNodeList } : {}),
      ...(Object.keys(cleanLinks).length > 0 ? { links: cleanLinks } : {}),
      ...(Object.keys(cleanImages).length > 0 ? { images: cleanImages } : {}),
      ...(Object.keys(cleanBoxes).length > 0 ? { boxes: cleanBoxes } : {}),
    },
  };
}

export function editorSignature(draft: EditorDraft) {
  return JSON.stringify(homeEditorDocument(draft).editor);
}

function sortedJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(sortedJson).join(",")}]`;
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    const keys = Object.keys(record).filter((key) => record[key] !== undefined).sort();
    return `{${keys.map((key) => `${JSON.stringify(key)}:${sortedJson(record[key])}`).join(",")}}`;
  }
  return JSON.stringify(value) ?? "null";
}

// The database stores documents as jsonb, which does not keep object key order.
export function sameEditorDraft(left: EditorDraft, right: EditorDraft) {
  return sortedJson(homeEditorDocument(left).editor) === sortedJson(homeEditorDocument(right).editor);
}

export function readHomeEditor(document: unknown): EditorDraft {
  const empty = emptyDraft();
  if (!document || typeof document !== "object") return empty;
  const record = document as { version?: unknown; editor?: unknown };
  if (record.version !== 2 || !record.editor || typeof record.editor !== "object") return empty;
  const editor = record.editor as { target?: unknown; copies?: unknown; layers?: unknown; nodes?: unknown; links?: unknown; images?: unknown; boxes?: unknown };
  if (editor.target !== "home") return empty;
  const copies: Record<string, EditorCopyPatch> = {};
  if (editor.copies && typeof editor.copies === "object") {
    for (const [id, patch] of Object.entries(editor.copies as Record<string, EditorCopyPatch>)) {
      if (isEditableCopy(id) && patch && typeof patch === "object") copies[id] = patch;
    }
  }
  const layers: LegacyTextLayer[] = [];
  if (Array.isArray(editor.layers)) {
    for (const layer of editor.layers) {
      if (!layer || typeof layer !== "object") continue;
      const item = layer as LegacyTextLayer;
      if (item.type !== "text" || !isCollectionCard(item.parentId) || !item.desktop) continue;
      layers.push(item);
    }
  }
  const links: Record<string, EditorLinkPatch> = {};
  if (editor.links && typeof editor.links === "object") {
    for (const [id, patch] of Object.entries(editor.links as Record<string, EditorLinkPatch>)) {
      if (linkKind(id) && patch && typeof patch === "object") links[id] = patch;
    }
  }
  const images: Record<string, EditorImagePatch> = {};
  if (editor.images && typeof editor.images === "object") {
    for (const [id, patch] of Object.entries(editor.images as Record<string, EditorImagePatch>)) {
      if (imageKind(id) && patch && typeof patch === "object") images[id] = patch;
    }
  }
  const boxes: Record<string, EditorBoxStyle> = {};
  if (editor.boxes && typeof editor.boxes === "object") {
    for (const [id, patch] of Object.entries(editor.boxes as Record<string, EditorBoxStyle>)) {
      if (boxKind(id) && patch && typeof patch === "object") boxes[id] = patch;
    }
  }
  // Old card text layers open as text nodes in memory; they are only rewritten when the user saves,
  // and earlier revisions keep the original format.
  const stored = cleanNodes(editor.nodes);
  const nodes = cleanNodes([...stored, ...layersToNodes(layers, new Set(stored.map((node) => node.id)))]);
  return { copies, nodes, links, images, boxes };
}

export function toHexColor(color: string) {
  const match = color.match(/rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)/);
  if (!match) return "#1a2e24";
  return `#${match.slice(1, 4).map((part) => Number(part).toString(16).padStart(2, "0")).join("")}`;
}
