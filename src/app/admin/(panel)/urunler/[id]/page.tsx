import { ApiError } from "@/lib/api";
import { adminApi } from "@/lib/admin";
import { ProductForm } from "@/components/admin/ProductForm";
import type { AdminProduct } from "@/lib/products";

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const [product, categories, collections] = await Promise.all([
      adminApi<{ data: AdminProduct }>(`/admin/products/${id}`),
      adminApi<{ data: { id: string; name: string }[] }>("/admin/categories"),
      adminApi<{ data: { id: string; name: string }[] }>("/admin/collections"),
    ]);
    return (
      <>
        <div className="admin-top"><h1>{product.data.name}</h1></div>
        <ProductForm product={product.data} categories={categories.data} collections={collections.data} />
      </>
    );
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return <section className="panel-admin"><p>Ürün bulunamadı.</p></section>;
    }
    throw error;
  }
}
