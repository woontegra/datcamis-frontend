import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProductCard } from "@/components/store/ProductCard";
import { getCollection, getProducts, orNotFound } from "@/lib/store";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const collection = await orNotFound(() => getCollection(slug));
  if (!collection) return { title: "Koleksiyon" };
  return { title: collection.name, description: collection.seo?.description || collection.description };
}

export default async function CollectionPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const collection = await orNotFound(() => getCollection(slug));
  if (!collection) notFound();
  const products = await getProducts(`?collection=${slug}&pageSize=24`);
  return (
    <div className="wrap section">
      <p className="eyebrow">Koleksiyon</p>
      <h1>{collection.name}</h1>
      <p className="lede">{collection.description}</p>
      <div className="product-grid">{products.data.map((product) => <ProductCard key={product.id} product={product} />)}</div>
    </div>
  );
}
