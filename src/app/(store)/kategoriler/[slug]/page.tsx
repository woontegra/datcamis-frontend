import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProductCard } from "@/components/store/ProductCard";
import { getCategory, getProducts, orNotFound } from "@/lib/store";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const category = await orNotFound(() => getCategory(slug));
  if (!category) return { title: "Kategori" };
  return { title: category.name, description: category.seo?.description || category.description };
}

export default async function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const category = await orNotFound(() => getCategory(slug));
  if (!category) notFound();
  const products = await getProducts(`?category=${slug}&pageSize=24`);
  return (
    <div className="wrap section">
      <p className="eyebrow">Kategori</p>
      <h1>{category.name}</h1>
      <p className="lede">{category.description}</p>
      <div className="product-grid">{products.data.map((product) => <ProductCard key={product.id} product={product} />)}</div>
    </div>
  );
}
