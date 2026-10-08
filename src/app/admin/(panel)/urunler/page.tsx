import { Rows } from "@/components/admin/Rows";
import { adminApi } from "@/lib/admin";
import { formatTry } from "@/lib/money";
import type { Product } from "@/lib/types";

export default async function ProductsAdmin() {
  const body = await adminApi<{ data: Product[] }>("/admin/products");
  return (
    <>
      <div className="admin-top"><h1>Ürünler</h1></div>
      <section className="panel-admin">
        <Rows
          headers={["Ürün", "Durum", "Varyant", "Test fiyatı", "Stok"]}
          rows={body.data.flatMap((product) => product.variants.map((variant) => [
            `${product.name}${product.isSeed ? " (seed)" : ""}`,
            product.status,
            variant.name,
            formatTry(variant.priceAmount),
            String(variant.onHand ?? 0),
          ]))}
        />
      </section>
    </>
  );
}
