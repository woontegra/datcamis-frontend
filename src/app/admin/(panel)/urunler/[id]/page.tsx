import { ApiError } from "@/lib/api";
import { adminApi } from "@/lib/admin";
import { ProductForm } from "@/components/admin/ProductForm";
import type { AdminProduct } from "@/lib/products";
import type { AdminAttribute } from "@/components/admin/attributes/AttributeManager";

async function loadProduct(id: string) {
  try {
    return await adminApi<{ data: AdminProduct }>(`/admin/products/${id}`);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  }
}

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [product, categories, collections, attributes] = await Promise.all([
    loadProduct(id),
    adminApi<{ data: { id: string; name: string }[] }>("/admin/categories"),
    adminApi<{ data: { id: string; name: string }[] }>("/admin/collections"),
    adminApi<{ data: AdminAttribute[] }>("/admin/attributes"),
  ]);
  if (!product) return <section className="panel-admin"><p>Ürün bulunamadı.</p></section>;
  return (
    <>
      <div className="admin-top"><h1>{product.data.name}</h1></div>
      <ProductForm product={product.data} categories={categories.data} collections={collections.data} attributes={attributes.data} />
    </>
  );
}
