import { cleanDeviceOverrides, resolveForDevice, type DeviceOverrides, type EditorDevice } from "@/lib/editor-devices";
import { isMediaId, mediaUrl } from "@/lib/editor-images";

export type BoxKind = "section" | "container" | "card";

export type BoxShadow = { x: number; y: number; blur: number; color: string; opacity: number };

export type BoxSide = "Top" | "Right" | "Bottom" | "Left";

export type EditorBoxValues = {
  background?: string;
  backgroundMediaId?: string;
  width?: number;
  height?: number;
  minHeight?: number;
  borderWidth?: number;
  borderColor?: string;
  radius?: number;
  shadow?: BoxShadow;
  opacity?: number;
  paddingTop?: number;
  paddingRight?: number;
  paddingBottom?: number;
  paddingLeft?: number;
  marginTop?: number;
  marginRight?: number;
  marginBottom?: number;
  marginLeft?: number;
};

export type EditorBoxStyle = EditorBoxValues & DeviceOverrides<EditorBoxValues>;

// Colours, border, corners, shadow and opacity are shared; size and spacing are set per screen.
export const BOX_DEVICE_KEYS = [
  "width",
  "height",
  "minHeight",
  "paddingTop",
  "paddingRight",
  "paddingBottom",
  "paddingLeft",
  "marginTop",
  "marginRight",
  "marginBottom",
  "marginLeft",
] as const satisfies readonly (keyof EditorBoxValues)[];

export const BOX_SIDES: { side: BoxSide; label: string }[] = [
  { side: "Top", label: "Üst" },
  { side: "Right", label: "Sağ" },
  { side: "Bottom", label: "Alt" },
  { side: "Left", label: "Sol" },
];

const BOX_KINDS: [RegExp, BoxKind][] = [
  [/^home\.(?:hero|features|collections|products|story|promos)$/, "section"],
  [/^home\.(?:hero\.(?:copy|visual)|story\.copy|collections\.grid|products\.grid)$/, "container"],
  [/^home\.(?:collections|promos)\.card\.[a-z0-9-]+$/, "card"],
  [/^home\.features\.(?:natural|lasting|place|gift)$/, "card"],
  [/^home\.products\.card\.[a-z0-9-]+(?:\.body)?$/, "card"],
];

export function boxKind(id: string): BoxKind | null {
  return BOX_KINDS.find(([pattern]) => pattern.test(id))?.[1] ?? null;
}

export function isProductCardBox(id: string) {
  return /^home\.products\.card\.[a-z0-9-]+(?:\.body)?$/.test(id);
}

type BoxNumberKey = Exclude<keyof EditorBoxValues, "background" | "backgroundMediaId" | "borderColor" | "shadow">;
type ShadowNumberKey = Exclude<keyof BoxShadow, "color">;

const BOX_LIMITS: Record<BoxNumberKey, [number, number]> = {
  width: [40, 2000],
  height: [20, 2000],
  minHeight: [0, 2000],
  borderWidth: [0, 20],
  radius: [0, 400],
  opacity: [10, 100],
  paddingTop: [0, 400],
  paddingRight: [0, 400],
  paddingBottom: [0, 400],
  paddingLeft: [0, 400],
  marginTop: [0, 400],
  marginRight: [0, 400],
  marginBottom: [0, 400],
  marginLeft: [0, 400],
};

const SHADOW_LIMITS: Record<ShadowNumberKey, [number, number]> = {
  x: [-100, 100],
  y: [-100, 100],
  blur: [0, 200],
  opacity: [0, 100],
};

function clamp(value: number, [min, max]: [number, number]) {
  return Math.min(max, Math.max(min, Math.round(value)));
}

export function clampBoxNumber(key: BoxNumberKey, value: number) {
  return clamp(value, BOX_LIMITS[key]);
}

export function clampShadowNumber(key: ShadowNumberKey, value: number) {
  return clamp(value, SHADOW_LIMITS[key]);
}

export const DEFAULT_SHADOW: BoxShadow = { x: 0, y: 8, blur: 24, color: "#28200f", opacity: 12 };

const HEX = /^#[0-9a-fA-F]{6}$/;

export function cleanBoxStyle(patch: EditorBoxStyle): EditorBoxStyle {
  return { ...cleanBoxValues(patch), ...cleanDeviceOverrides<EditorBoxValues>(patch, BOX_DEVICE_KEYS, cleanBoxValues) };
}

function cleanBoxValues(patch: EditorBoxValues): EditorBoxValues {
  const next: EditorBoxValues = {};
  if (patch.background && HEX.test(patch.background)) next.background = patch.background;
  if (patch.backgroundMediaId && isMediaId(patch.backgroundMediaId)) next.backgroundMediaId = patch.backgroundMediaId;
  if (patch.borderColor && HEX.test(patch.borderColor)) next.borderColor = patch.borderColor;
  for (const key of Object.keys(BOX_LIMITS) as BoxNumberKey[]) {
    const value = patch[key];
    if (typeof value === "number" && Number.isFinite(value)) next[key] = clampBoxNumber(key, value);
  }
  if (patch.shadow && HEX.test(patch.shadow.color)) {
    next.shadow = {
      x: clampShadowNumber("x", patch.shadow.x),
      y: clampShadowNumber("y", patch.shadow.y),
      blur: clampShadowNumber("blur", patch.shadow.blur),
      color: patch.shadow.color,
      opacity: clampShadowNumber("opacity", patch.shadow.opacity),
    };
  }
  return next;
}

export function shadowCss({ x, y, blur, color, opacity }: BoxShadow) {
  const [r, g, b] = [1, 3, 5].map((start) => Number.parseInt(color.slice(start, start + 2), 16));
  return `${x}px ${y}px ${blur}px rgba(${r}, ${g}, ${b}, ${opacity / 100})`;
}

const px = (value: number | undefined) => (value == null ? "" : `${value}px`);

export function applyBoxStyle(element: HTMLElement, raw: EditorBoxStyle, device: EditorDevice) {
  const patch = resolveForDevice<EditorBoxValues>(raw, device, BOX_DEVICE_KEYS);
  const css = element.style;
  css.backgroundColor = patch.background ?? "";
  const media = patch.backgroundMediaId && isMediaId(patch.backgroundMediaId) ? patch.backgroundMediaId : null;
  css.backgroundImage = media ? `url("${mediaUrl(media)}")` : "";
  css.backgroundSize = media ? "cover" : "";
  css.backgroundPosition = media ? "center" : "";
  css.borderStyle = patch.borderWidth != null ? "solid" : "";
  css.borderWidth = px(patch.borderWidth);
  css.borderColor = patch.borderColor ?? "";
  css.borderRadius = px(patch.radius);
  css.boxShadow = patch.shadow ? shadowCss(patch.shadow) : "";
  css.opacity = patch.opacity == null ? "" : String(patch.opacity / 100);

  const sized = patch.width != null || patch.height != null;
  css.boxSizing = sized ? "border-box" : "";
  css.width = px(patch.width);
  css.maxWidth = patch.width != null ? "100%" : "";
  css.height = px(patch.height);
  css.minHeight = px(patch.minHeight);
  for (const { side } of BOX_SIDES) {
    css[`padding${side}`] = px(patch[`padding${side}`]);
    css[`margin${side}`] = px(patch[`margin${side}`]);
  }
}
