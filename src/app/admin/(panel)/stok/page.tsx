import { Rows } from "@/components/admin/Rows";
import { adminApi } from "@/lib/admin";
import type { Product } from "@/lib/types";

export default async function StockAdmin() {
  const body = await adminApi<{ data: Product[] }>("/admin/products");
  return (
    <>
      <div className="admin-top"><h1>Stok</h1></div>
      <section className="panel-admin">
        <Rows
          headers={["SKU", "Elde", "Rezerve", "Eşik"]}
          rows={body.data.flatMap((product) => product.variants.map((variant) => [
            variant.sku,
            String(variant.onHand ?? 0),
            String(variant.reserved ?? 0),
            String(variant.lowThreshold ?? 0),
          ]))}
        />
      </section>
    </>
  );
}
