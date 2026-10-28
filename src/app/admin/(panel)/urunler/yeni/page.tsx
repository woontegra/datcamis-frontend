import { adminApi } from "@/lib/admin";
import { ProductForm } from "@/components/admin/ProductForm";

export default async function NewProductPage() {
  const [categories, collections] = await Promise.all([
    adminApi<{ data: { id: string; name: string }[] }>("/admin/categories"),
    adminApi<{ data: { id: string; name: string }[] }>("/admin/collections"),
  ]);
  return (
    <>
      <div className="admin-top"><h1>Yeni ürün</h1></div>
      <ProductForm categories={categories.data} collections={collections.data} />
    </>
  );
}
