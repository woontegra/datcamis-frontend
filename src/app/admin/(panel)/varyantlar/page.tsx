import { Rows } from "@/components/admin/Rows";
import { adminApi } from "@/lib/admin";
import type { Product } from "@/lib/types";

export default async function VariantsAdmin() {
  const body = await adminApi<{ data: Product[] }>("/admin/products");
  return (
    <>
      <div className="admin-top"><h1>Varyantlar</h1></div>
      <section className="panel-admin">
        <Rows
          headers={["SKU", "Ürün", "Ad", "Seçenek"]}
          rows={body.data.flatMap((product) => product.variants.map((variant) => [
            variant.sku,
            product.name,
            variant.name,
            variant.options.map((option) => `${option.name}: ${option.value}`).join(", "),
          ]))}
        />
      </section>
    </>
  );
}
