import { adminApi } from "@/lib/admin";
import { ProductForm } from "@/components/admin/ProductForm";
import type { AdminAttribute } from "@/components/admin/attributes/AttributeManager";

export default async function NewProductPage() {
  const [categories, collections, attributes] = await Promise.all([
    adminApi<{ data: { id: string; name: string }[] }>("/admin/categories"),
    adminApi<{ data: { id: string; name: string }[] }>("/admin/collections"),
    adminApi<{ data: AdminAttribute[] }>("/admin/attributes"),
  ]);
  return (
    <>
      <div className="admin-top"><h1>Yeni ürün</h1></div>
      <ProductForm categories={categories.data} collections={collections.data} attributes={attributes.data} />
    </>
  );
}
