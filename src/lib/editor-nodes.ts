import type { BoxShadow } from "@/lib/editor-boxes";
import { isNodeIcon, type NodeIcon } from "@/lib/editor-icons";
import { isMediaId } from "@/lib/editor-images";
import { checkHref } from "@/lib/editor-links";

export type NodeType = "container" | "text" | "image" | "button" | "icon";
export type NodeBox = { x: number; y: number; width: number; height: number };
export type NodeSize = { width: number; height: number };
export type NodeAlign = "left" | "center" | "right";
export type NodeFont = "display" | "sans" | "script";
export type NodeWeight = 400 | 500 | 600 | 700;

export type NodeTextStyle = {
  fontSize?: number;
  color?: string;
  fontWeight?: NodeWeight;
  align?: NodeAlign;
  fontFamily?: NodeFont;
  lineHeight?: number;
};

export type NodeContainerStyle = {
  background?: string;
  borderWidth?: number;
  borderColor?: string;
  radius?: number;
  opacity?: number;
  shadow?: BoxShadow;
};

export type NodeImageStyle = {
  fit?: "cover" | "contain";
  focusX?: number;
  focusY?: number;
  radius?: number;
  borderWidth?: number;
  borderColor?: string;
};

export type NodeButtonStyle = {
  background?: string;
  color?: string;
  fontSize?: number;
  fontWeight?: NodeWeight;
  borderWidth?: number;
  borderColor?: string;
  radius?: number;
};

export type NodeIconStyle = { color?: string };

export type NodeDevice = "desktop" | "tablet" | "mobile";
// Text and button nodes may also take their own font size (and text its line height) per screen.
export type NodeDeviceStyle = { fontSize?: number; lineHeight?: number };
export type NodeLayout = { box: NodeBox; frame?: NodeSize } & NodeDeviceStyle;
export const NODE_DEVICE_STYLE_KEYS = ["fontSize", "lineHeight"] as const;
const MIN_DEVICE_FONT = 12;

// Desktop is the default design; tablet and mobile layouts are optional overrides.
type NodeBase = { id: string; parentId: string; order: number; desktop: NodeBox; frame?: NodeSize; tablet?: NodeLayout; mobile?: NodeLayout };

export type EditorNode =
  | (NodeBase & { type: "container"; style?: NodeContainerStyle })
  | (NodeBase & { type: "text"; text: string; style?: NodeTextStyle })
  | (NodeBase & { type: "image"; mediaId?: string; alt?: string; style?: NodeImageStyle })
  | (NodeBase & { type: "button"; text: string; href?: string; style?: NodeButtonStyle })
  | (NodeBase & { type: "icon"; icon: NodeIcon; style?: NodeIconStyle });

export const NODE_LABELS: Record<NodeType, string> = { container: "Konteyner", text: "Metin", image: "Görsel", button: "Buton", icon: "İkon" };

export type LegacyTextLayer = { id: string; type: "text"; parentId: string; text: string; desktop: NodeBox };

export const MAX_NODES = 200;
export const MAX_DEPTH = 4;
const MIN_WIDTH = 24;
const MIN_HEIGHT = 20;
const LIMIT = 4000;

const NODE_ID = /^[a-f0-9]{8}$/;
const NODE_EDITOR_ID = /^node\.([a-f0-9]{8})$/;
const HEX = /^#[0-9a-fA-F]{6}$/;
// Product cards and product grids stay out: nothing may be layered over catalogue data.
const NODE_HOST =
  /^home\.(?:hero|features|collections|story|promos|hero\.(?:copy|visual)|story\.copy|collections\.grid|(?:collections|promos)\.card\.[a-z0-9-]+|features\.(?:natural|lasting|place|gift))$/;

export function isNodeHost(id: string) {
  return NODE_HOST.test(id);
}

export function isNodeId(id: string) {
  return NODE_ID.test(id);
}

export function nodeEditorId(id: string) {
  return `node.${id}`;
}

export function findNode(nodes: EditorNode[], editorId: string | null) {
  const id = editorId?.match(NODE_EDITOR_ID)?.[1];
  return id ? nodes.find((node) => node.id === id) ?? null : null;
}

export function parentEditorId(node: EditorNode) {
  return isNodeId(node.parentId) ? nodeEditorId(node.parentId) : node.parentId;
}

export function childrenOf(nodes: EditorNode[], parentId: string) {
  return nodes.filter((node) => node.parentId === parentId).sort((left, right) => left.order - right.order);
}

export function nodeDepth(nodes: EditorNode[], node: EditorNode) {
  const byId = new Map(nodes.map((item) => [item.id, item]));
  let depth = 1;
  let parent = node.parentId;
  const seen = new Set([node.id]);
  while (isNodeId(parent)) {
    const next = byId.get(parent);
    if (!next || next.type !== "container" || seen.has(next.id)) return Infinity;
    seen.add(next.id);
    depth += 1;
    parent = next.parentId;
  }
  return isNodeHost(parent) ? depth : Infinity;
}

export function descendantIds(nodes: EditorNode[], id: string) {
  const found = new Set<string>();
  const visit = (parentId: string) => {
    for (const node of nodes) {
      if (node.parentId !== parentId || found.has(node.id)) continue;
      found.add(node.id);
      visit(node.id);
    }
  };
  visit(id);
  return found;
}

function newNodeId(taken: Set<string>) {
  for (;;) {
    const bytes = crypto.getRandomValues(new Uint8Array(4));
    const id = [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
    if (!taken.has(id)) return id;
  }
}

const round = (value: number) => Math.round(Number.isFinite(value) ? value : 0);

export function clampNodeBox(box: NodeBox, bounds: NodeSize): NodeBox {
  const maxWidth = Math.max(1, Math.min(LIMIT, round(bounds.width)));
  const maxHeight = Math.max(1, Math.min(LIMIT, round(bounds.height)));
  const width = Math.min(Math.max(round(box.width), Math.min(MIN_WIDTH, maxWidth)), maxWidth);
  const height = Math.min(Math.max(round(box.height), Math.min(MIN_HEIGHT, maxHeight)), maxHeight);
  const x = Math.min(Math.max(round(box.x), 0), maxWidth - width);
  const y = Math.min(Math.max(round(box.y), 0), maxHeight - height);
  return { x, y, width, height };
}

// Top-level nodes keep the host size they were placed in; on a smaller host the whole node is
// scaled down to fit, so it never overflows and keeps its relation to the host's image.
export function nodeBox(node: EditorNode, device: NodeDevice = "desktop"): NodeBox {
  return (device !== "desktop" && node[device]?.box) || node.desktop;
}

export function hasLayout(node: EditorNode, device: NodeDevice) {
  return device !== "desktop" && !!node[device];
}

export function deviceStyleKeys(node: EditorNode): (keyof NodeDeviceStyle)[] {
  if (node.type === "text") return ["fontSize", "lineHeight"];
  return node.type === "button" ? ["fontSize"] : [];
}

/** The node as it looks on the given screen: its own font settings replace the desktop ones. */
export function nodeForDevice(node: EditorNode, device: NodeDevice): EditorNode {
  const layout = device !== "desktop" ? node[device] : undefined;
  if (!layout) return node;
  const own: NodeDeviceStyle = {};
  for (const key of deviceStyleKeys(node)) if (layout[key] != null) own[key] = layout[key];
  return Object.keys(own).length > 0 ? ({ ...node, style: { ...node.style, ...own } } as EditorNode) : node;
}

export function nodeFrame(node: EditorNode, device: NodeDevice = "desktop"): NodeSize {
  const layout = device !== "desktop" ? node[device] : undefined;
  if (layout?.frame) return layout.frame;
  if (node.frame) return node.frame;
  const box = nodeBox(node, device);
  return { width: box.x + box.width, height: box.y + box.height };
}

export function nodeScale(node: EditorNode, host: NodeSize, device: NodeDevice = "desktop") {
  const frame = nodeFrame(node, device);
  return Math.min(1, host.width / Math.max(1, frame.width), host.height / Math.max(1, frame.height));
}

export function innerSize(node: EditorNode, device: NodeDevice = "desktop"): NodeSize {
  const border = node.type === "container" ? (node.style?.borderWidth ?? 0) * 2 : 0;
  const box = nodeBox(node, device);
  return { width: Math.max(1, box.width - border), height: Math.max(1, box.height - border) };
}

export function nodeBounds(nodes: EditorNode[], node: EditorNode, device: NodeDevice = "desktop"): NodeSize {
  if (!isNodeId(node.parentId)) return nodeFrame(node, device);
  const parent = nodes.find((item) => item.id === node.parentId);
  return parent ? innerSize(parent, device) : nodeFrame(node, device);
}

export function sameBox(left: NodeBox, right: NodeBox) {
  return left.x === right.x && left.y === right.y && left.width === right.width && left.height === right.height;
}

export function canHoldNodes(nodes: EditorNode[], editorId: string | null) {
  if (!editorId) return false;
  if (isNodeHost(editorId)) return true;
  const node = findNode(nodes, editorId);
  return !!node && node.type === "container" && nodeDepth(nodes, node) < MAX_DEPTH;
}

export function createNode(nodes: EditorNode[], type: NodeType, parentEditor: string, bounds: NodeSize, light: boolean): EditorNode | null {
  if (nodes.length >= MAX_NODES) return null;
  const parentNode = findNode(nodes, parentEditor);
  const parentId = parentNode ? parentNode.id : parentEditor;
  const siblings = childrenOf(nodes, parentId);
  const order = siblings.length ? siblings[siblings.length - 1].order + 1 : 0;
  const offset = 16 + (siblings.length % 6) * 12;
  const id = newNodeId(new Set(nodes.map((node) => node.id)));
  const frame = parentNode ? undefined : { width: round(bounds.width), height: round(bounds.height) };
  const base = { id, parentId, order, ...(frame ? { frame } : {}) };
  const box = (width: number, height: number) => clampNodeBox({ x: offset, y: offset, width, height }, bounds);
  switch (type) {
    case "container":
      return { ...base, type, desktop: box(220, 140), style: { background: "#fffdf8", borderWidth: 1, borderColor: "#e4d8c4", radius: 12 } };
    case "image":
      return { ...base, type, desktop: box(180, 130), style: { fit: "cover", radius: 8 } };
    case "button":
      return {
        ...base,
        type,
        text: "Keşfet",
        href: "/urunler",
        desktop: box(140, 44),
        style: { background: "#1e4a38", color: "#fffdf8", fontSize: 15, fontWeight: 600, radius: 999 },
      };
    case "icon":
      return { ...base, type, icon: "leaf", desktop: box(48, 48), style: { color: light ? "#ffffff" : "#1e4a38" } };
    default:
      return { ...base, type: "text", text: "Yeni metin", desktop: box(160, 40), style: { color: light ? "#ffffff" : "#1a2e24", fontSize: 18 } };
  }
}

export function duplicateNode(nodes: EditorNode[], id: string): { nodes: EditorNode[]; copyId: string } | null {
  const source = nodes.find((node) => node.id === id);
  if (!source) return null;
  const family = [source, ...nodes.filter((node) => descendantIds(nodes, id).has(node.id))];
  if (nodes.length + family.length > MAX_NODES) return null;
  const taken = new Set(nodes.map((node) => node.id));
  const ids = new Map<string, string>();
  for (const node of family) {
    const next = newNodeId(taken);
    taken.add(next);
    ids.set(node.id, next);
  }
  const siblings = childrenOf(nodes, source.parentId);
  const order = siblings[siblings.length - 1].order + 1;
  const bounds = nodeBounds(nodes, source);
  const copies = family.map((node): EditorNode => {
    const copy = structuredClone(node);
    copy.id = ids.get(node.id)!;
    if (node.id === source.id) {
      copy.order = order;
      copy.desktop = clampNodeBox({ ...node.desktop, x: node.desktop.x + 16, y: node.desktop.y + 16 }, bounds);
      for (const device of ["tablet", "mobile"] as const) {
        const layout = node[device];
        if (!layout) continue;
        copy[device] = { ...layout, box: clampNodeBox({ ...layout.box, x: layout.box.x + 16, y: layout.box.y + 16 }, nodeBounds(nodes, source, device)) };
      }
    } else {
      copy.parentId = ids.get(node.parentId) ?? node.parentId;
    }
    return copy;
  });
  return { nodes: [...nodes, ...copies], copyId: ids.get(source.id)! };
}

export function removeNode(nodes: EditorNode[], id: string) {
  const gone = descendantIds(nodes, id);
  gone.add(id);
  return nodes.filter((node) => !gone.has(node.id));
}

export type NodeOrderMove = "front" | "forward" | "backward" | "back";

export function reorderNode(nodes: EditorNode[], id: string, move: NodeOrderMove) {
  const node = nodes.find((item) => item.id === id);
  if (!node) return nodes;
  const siblings = childrenOf(nodes, node.parentId);
  const index = siblings.findIndex((item) => item.id === id);
  const list = siblings.filter((item) => item.id !== id);
  const target = move === "front" ? list.length : move === "back" ? 0 : move === "forward" ? Math.min(list.length, index + 1) : Math.max(0, index - 1);
  list.splice(target, 0, node);
  const orders = new Map(list.map((item, position) => [item.id, position]));
  return nodes.map((item) => (orders.has(item.id) ? { ...item, order: orders.get(item.id)! } : item));
}

export function layersToNodes(layers: LegacyTextLayer[], taken: Set<string>): EditorNode[] {
  const order = new Map<string, number>();
  const nodes: EditorNode[] = [];
  for (const layer of layers) {
    if (taken.has(layer.id)) continue;
    const next = order.get(layer.parentId) ?? 0;
    order.set(layer.parentId, next + 1);
    nodes.push({ id: layer.id, type: "text", parentId: layer.parentId, order: next, desktop: layer.desktop, text: layer.text });
  }
  return nodes;
}

const clampTo = (value: unknown, min: number, max: number) =>
  typeof value === "number" && Number.isFinite(value) ? Math.min(max, Math.max(min, Math.round(value))) : undefined;

function cleanSize(size: unknown): NodeSize | undefined {
  if (!size || typeof size !== "object") return undefined;
  const { width, height } = size as NodeSize;
  const w = clampTo(width, 1, LIMIT);
  const h = clampTo(height, 1, LIMIT);
  return w && h ? { width: w, height: h } : undefined;
}

function cleanBox(box: unknown): NodeBox | undefined {
  if (!box || typeof box !== "object") return undefined;
  const raw = box as NodeBox;
  return {
    x: clampTo(raw.x, 0, LIMIT) ?? 0,
    y: clampTo(raw.y, 0, LIMIT) ?? 0,
    width: clampTo(raw.width, 1, LIMIT) ?? MIN_WIDTH,
    height: clampTo(raw.height, 1, LIMIT) ?? MIN_HEIGHT,
  };
}

function cleanLayout(layout: unknown): NodeLayout | undefined {
  if (!layout || typeof layout !== "object") return undefined;
  const box = cleanBox((layout as NodeLayout).box);
  if (!box) return undefined;
  const raw = layout as NodeLayout;
  const frame = cleanSize(raw.frame);
  const next: NodeLayout = frame ? { box, frame } : { box };
  const fontSize = clampTo(raw.fontSize, MIN_DEVICE_FONT, 120);
  if (fontSize) next.fontSize = fontSize;
  if (typeof raw.lineHeight === "number" && Number.isFinite(raw.lineHeight)) next.lineHeight = Math.min(3, Math.max(0.8, Math.round(raw.lineHeight * 100) / 100));
  return next;
}

function cleanTextStyle(style: NodeTextStyle | undefined): NodeTextStyle | undefined {
  if (!style) return undefined;
  const next: NodeTextStyle = {};
  const fontSize = clampTo(style.fontSize, 8, 120);
  if (fontSize) next.fontSize = fontSize;
  if (style.color && HEX.test(style.color)) next.color = style.color;
  if (style.fontWeight && [400, 500, 600, 700].includes(style.fontWeight)) next.fontWeight = style.fontWeight;
  if (style.align && ["left", "center", "right"].includes(style.align)) next.align = style.align;
  if (style.fontFamily && ["display", "sans", "script"].includes(style.fontFamily)) next.fontFamily = style.fontFamily;
  if (typeof style.lineHeight === "number" && Number.isFinite(style.lineHeight)) next.lineHeight = Math.min(3, Math.max(0.8, Math.round(style.lineHeight * 100) / 100));
  return Object.keys(next).length ? next : undefined;
}

function cleanContainerStyle(style: NodeContainerStyle | undefined): NodeContainerStyle | undefined {
  if (!style) return undefined;
  const next: NodeContainerStyle = {};
  if (style.background && HEX.test(style.background)) next.background = style.background;
  if (style.borderColor && HEX.test(style.borderColor)) next.borderColor = style.borderColor;
  const borderWidth = clampTo(style.borderWidth, 0, 20);
  if (borderWidth !== undefined) next.borderWidth = borderWidth;
  const radius = clampTo(style.radius, 0, 400);
  if (radius !== undefined) next.radius = radius;
  const opacity = clampTo(style.opacity, 10, 100);
  if (opacity !== undefined) next.opacity = opacity;
  const shadow = style.shadow;
  if (shadow && HEX.test(shadow.color)) {
    next.shadow = {
      x: clampTo(shadow.x, -100, 100) ?? 0,
      y: clampTo(shadow.y, -100, 100) ?? 0,
      blur: clampTo(shadow.blur, 0, 200) ?? 0,
      color: shadow.color,
      opacity: clampTo(shadow.opacity, 0, 100) ?? 0,
    };
  }
  return Object.keys(next).length ? next : undefined;
}

function cleanImageStyle(style: NodeImageStyle | undefined): NodeImageStyle | undefined {
  if (!style) return undefined;
  const next: NodeImageStyle = {};
  if (style.fit === "cover" || style.fit === "contain") next.fit = style.fit;
  const focusX = clampTo(style.focusX, 0, 100);
  if (focusX !== undefined) next.focusX = focusX;
  const focusY = clampTo(style.focusY, 0, 100);
  if (focusY !== undefined) next.focusY = focusY;
  const radius = clampTo(style.radius, 0, 400);
  if (radius !== undefined) next.radius = radius;
  const borderWidth = clampTo(style.borderWidth, 0, 20);
  if (borderWidth !== undefined) next.borderWidth = borderWidth;
  if (style.borderColor && HEX.test(style.borderColor)) next.borderColor = style.borderColor;
  return Object.keys(next).length ? next : undefined;
}

function cleanButtonStyle(style: NodeButtonStyle | undefined): NodeButtonStyle | undefined {
  if (!style) return undefined;
  const next: NodeButtonStyle = {};
  if (style.background && HEX.test(style.background)) next.background = style.background;
  if (style.color && HEX.test(style.color)) next.color = style.color;
  const fontSize = clampTo(style.fontSize, 8, 64);
  if (fontSize) next.fontSize = fontSize;
  if (style.fontWeight && [400, 500, 600, 700].includes(style.fontWeight)) next.fontWeight = style.fontWeight;
  const borderWidth = clampTo(style.borderWidth, 0, 20);
  if (borderWidth !== undefined) next.borderWidth = borderWidth;
  if (style.borderColor && HEX.test(style.borderColor)) next.borderColor = style.borderColor;
  const radius = clampTo(style.radius, 0, 999);
  if (radius !== undefined) next.radius = radius;
  return Object.keys(next).length ? next : undefined;
}

function singleLine(value: unknown, max: number) {
  return typeof value === "string" ? value.replace(/[\r\n]+/g, " ").slice(0, max) : "";
}

export function cleanNodes(raw: unknown): EditorNode[] {
  if (!Array.isArray(raw)) return [];
  const list: EditorNode[] = [];
  const ids = new Set<string>();
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const node = item as EditorNode;
    if (!isNodeId(node.id) || ids.has(node.id) || typeof node.parentId !== "string") continue;
    if (!isNodeId(node.parentId) && !isNodeHost(node.parentId)) continue;
    const desktop = cleanBox(node.desktop);
    if (!desktop) continue;
    const tablet = cleanLayout(node.tablet);
    const mobile = cleanLayout(node.mobile);
    const base = {
      id: node.id,
      parentId: node.parentId,
      order: clampTo(node.order, 0, 999) ?? 0,
      desktop,
      ...(cleanSize(node.frame) ? { frame: cleanSize(node.frame) } : {}),
      ...(tablet ? { tablet } : {}),
      ...(mobile ? { mobile } : {}),
    };
    if (node.type === "container") {
      const style = cleanContainerStyle(node.style);
      list.push({ ...base, type: "container", ...(style ? { style } : {}) });
    } else if (node.type === "text") {
      const style = cleanTextStyle(node.style);
      list.push({ ...base, type: "text", text: typeof node.text === "string" ? node.text.slice(0, 2000) : "", ...(style ? { style } : {}) });
    } else if (node.type === "image") {
      const style = cleanImageStyle(node.style);
      const alt = singleLine(node.alt, 200);
      list.push({
        ...base,
        type: "image",
        ...(typeof node.mediaId === "string" && isMediaId(node.mediaId) ? { mediaId: node.mediaId } : {}),
        ...(alt ? { alt } : {}),
        ...(style ? { style } : {}),
      });
    } else if (node.type === "button") {
      const style = cleanButtonStyle(node.style);
      const href = typeof node.href === "string" ? checkHref(node.href) : null;
      list.push({
        ...base,
        type: "button",
        text: singleLine(node.text, 120) || "Buton",
        ...(href?.ok ? { href: href.href } : {}),
        ...(style ? { style } : {}),
      });
    } else if (node.type === "icon") {
      if (!isNodeIcon(node.icon)) continue;
      const color = node.style?.color && HEX.test(node.style.color) ? node.style.color : undefined;
      list.push({ ...base, type: "icon", icon: node.icon, ...(color ? { style: { color } } : {}) });
    } else {
      continue;
    }
    ids.add(node.id);
  }
  let valid = list.slice(0, MAX_NODES);
  for (;;) {
    const next = valid.filter((node) => nodeDepth(valid, node) <= MAX_DEPTH);
    if (next.length === valid.length) return valid;
    valid = next;
  }
}
