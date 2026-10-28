import { TURKEY_DISTRICTS } from "./turkey-districts";

export { TURKEY_DISTRICTS };

export const PROVINCE_NAMES = Object.keys(TURKEY_DISTRICTS).sort((a, b) => a.localeCompare(b, "tr"));

export const TURKEY_PROVINCE_COUNT = PROVINCE_NAMES.length;
export const TURKEY_DISTRICT_COUNT = Object.values(TURKEY_DISTRICTS).reduce((sum, list) => sum + list.length, 0);

export function foldTr(value: string) {
  return value
    .trim()
    .toLocaleLowerCase("tr")
    .replace(/ç/g, "c")
    .replace(/ğ/g, "g")
    .replace(/ı/g, "i")
    .replace(/ö/g, "o")
    .replace(/ş/g, "s")
    .replace(/ü/g, "u");
}

export function districtsOf(city: string) {
  return TURKEY_DISTRICTS[city] ?? [];
}

export function isTurkeyCityDistrict(city: string, district: string) {
  return districtsOf(city).includes(district);
}

export function filterPlaces(options: string[], query: string) {
  const needle = foldTr(query);
  if (!needle) return options;
  const starts: string[] = [];
  const contains: string[] = [];
  for (const item of options) {
    const folded = foldTr(item);
    if (!folded.includes(needle)) continue;
    if (folded.startsWith(needle)) starts.push(item);
    else contains.push(item);
  }
  return [...starts, ...contains];
}
