import type { Metadata } from "next";
import { ProductCard } from "@/components/store/ProductCard";
import { getCategories, getProducts } from "@/lib/store";
import Link from "next/link";

export const metadata: Metadata = { title: "Ürünler", description: "DatçaMis seed kataloğu." };

export default async function ProductsPage({ searchParams }: { searchParams: Promise<{ q?: string; kategori?: string; sirala?: string }> }) {
  const query = await searchParams;
  const params = new URLSearchParams();
  if (query.q) params.set("q", query.q);
  if (query.kategori) params.set("category", query.kategori);
  if (query.sirala) params.set("sort", query.sirala);
  params.set("pageSize", "24");
  const [products, categories] = await Promise.all([
    getProducts(`?${params.toString()}`).catch(() => null),
    getCategories().catch(() => []),
  ]);
  return (
    <div className="wrap section">
      <p className="eyebrow">Katalog</p>
      <h1>Ürünler</h1>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginBottom: "1rem" }}>
        <Link className="text-btn" href="/urunler">Tümü</Link>
        {categories.map((category) => (
          <Link className="text-btn" key={category.id} href={`/kategoriler/${category.slug}`}>{category.name}</Link>
        ))}
      </div>
      {products ? (
        <>
          <p>{products.meta.total} kayıt</p>
          <div className="product-grid">{products.data.map((product) => <ProductCard key={product.id} product={product} />)}</div>
        </>
      ) : <p>Ürünler yüklenemedi.</p>}
    </div>
  );
}
