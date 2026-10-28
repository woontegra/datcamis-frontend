export function formatTry(amount: number) {
  const sign = amount < 0 ? "-" : "";
  const abs = Math.abs(Math.trunc(amount));
  const lira = Math.floor(abs / 100);
  const kurus = String(abs % 100).padStart(2, "0");
  const grouped = String(lira).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${sign}${grouped},${kurus} TL`;
}

export function defaultVariant<T extends { isDefault: boolean }>(product: { variants: T[] }) {
  return product.variants.find((variant) => variant.isDefault) || product.variants[0];
}
