export type EditorDevice = "desktop" | "tablet" | "mobile";
export type SizedDevice = Exclude<EditorDevice, "desktop">;

export const SIZED_DEVICES: SizedDevice[] = ["tablet", "mobile"];

// Smallest font size a tablet or phone override may set.
export const MIN_DEVICE_FONT = 12;

/**
 * Patches keep their desktop values at the top level. Layout settings for tablet and phone live in
 * optional `tablet` / `mobile` objects; without them those screens use the store's own responsive
 * layout, while shared settings (texts, colours, addresses, media) apply on every screen.
 */
export type DeviceOverrides<T> = { tablet?: Partial<T>; mobile?: Partial<T> };

type Patch = Record<string, unknown> & DeviceOverrides<Record<string, unknown>>;

function pick<T extends object>(source: Partial<T> | undefined, keys: readonly (keyof T)[]): Partial<T> {
  const out: Partial<T> = {};
  if (!source || typeof source !== "object") return out;
  for (const key of keys) if (source[key] !== undefined) out[key] = source[key];
  return out;
}

function without<T extends object>(source: T, keys: readonly PropertyKey[]): T {
  const out = { ...source } as Record<PropertyKey, unknown>;
  for (const key of keys) delete out[key];
  return out as T;
}

/** The settings that apply on the given screen. */
export function resolveForDevice<T extends object>(patch: T & DeviceOverrides<T>, device: EditorDevice, keys: readonly (keyof T)[]): T {
  const base = without(patch, ["tablet", "mobile"]) as T;
  if (device === "desktop") return base;
  return { ...without(base, keys), ...pick(patch[device], keys) };
}

export function writeForDevice<T extends object>(patch: (T & DeviceOverrides<T>) | undefined, partial: Partial<T>, device: EditorDevice, keys: readonly (keyof T)[]): T & DeviceOverrides<T> {
  const current = (patch ?? {}) as T & DeviceOverrides<T>;
  if (device === "desktop") return { ...current, ...partial };
  const own = pick(partial, keys);
  const shared = without(partial, keys);
  const next = { ...current, ...shared } as T & DeviceOverrides<T>;
  if (Object.keys(own).length > 0) next[device] = { ...current[device], ...own };
  return next;
}

export function clearForDevice<T extends object>(patch: (T & DeviceOverrides<T>) | undefined, key: keyof T, device: EditorDevice, keys: readonly (keyof T)[]): T & DeviceOverrides<T> {
  const next = { ...(patch ?? {}) } as T & DeviceOverrides<T>;
  if (device === "desktop" || !keys.includes(key)) {
    delete next[key];
    return next;
  }
  const own = { ...next[device] } as Partial<T>;
  delete own[key];
  if (Object.keys(own).length > 0) next[device] = own;
  else delete next[device];
  return next;
}

/** Removes only the given screen's own layout settings; shared settings stay. */
export function resetForDevice<T extends object>(patch: (T & DeviceOverrides<T>) | undefined, device: EditorDevice, keys: readonly (keyof T)[]): T & DeviceOverrides<T> {
  const next = { ...(patch ?? {}) } as T & DeviceOverrides<T>;
  if (device !== "desktop") {
    delete next[device];
    return next;
  }
  return without(next, keys);
}

export function hasDeviceValues<T extends object>(patch: (T & DeviceOverrides<T>) | undefined, device: EditorDevice, keys: readonly (keyof T)[]) {
  if (!patch) return false;
  if (device !== "desktop") return !!patch[device] && Object.keys(patch[device]!).length > 0;
  return keys.some((key) => patch[key] !== undefined);
}

/** Cleans each screen's overrides with the same rules as the desktop values. */
export function cleanDeviceOverrides<T extends object>(patch: DeviceOverrides<T>, keys: readonly (keyof T)[], clean: (values: Partial<T>, device: SizedDevice) => Partial<T>): DeviceOverrides<T> {
  const out: DeviceOverrides<T> = {};
  for (const device of SIZED_DEVICES) {
    const raw = (patch as Patch)[device];
    if (!raw || typeof raw !== "object") continue;
    const cleaned = pick(clean(pick(raw as Partial<T>, keys), device), keys);
    if (Object.keys(cleaned).length > 0) out[device] = cleaned;
  }
  return out;
}

export function isEmptyPatch(patch: object | undefined) {
  return !patch || Object.keys(patch).length === 0;
}
