export function formatTry(amount: number) {
  const sign = amount < 0 ? "-" : "";
  const abs = Math.abs(Math.trunc(amount));
  const lira = Math.floor(abs / 100);
  const kurus = String(abs % 100).padStart(2, "0");
  return `${sign}${lira.toLocaleString("tr-TR")},${kurus} TL`;
}

export function defaultVariant(product: { variants: { isDefault: boolean; priceAmount: number; inStock: boolean; id: string; name: string }[] }) {
  return product.variants.find((variant) => variant.isDefault) || product.variants[0];
}
