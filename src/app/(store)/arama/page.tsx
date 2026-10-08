import type { Metadata } from "next";
import { ProductCard } from "@/components/store/ProductCard";
import { getProducts } from "@/lib/store";

export const metadata: Metadata = { title: "Arama", robots: { index: false, follow: true } };

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = "" } = await searchParams;
  const result = q ? await getProducts(`?q=${encodeURIComponent(q)}&pageSize=24`).catch(() => null) : null;
  return (
    <div className="wrap section">
      <p className="eyebrow">Arama</p>
      <h1>Ürün ara</h1>
      <form action="/arama" className="field" style={{ maxWidth: "32rem" }}>
        <input name="q" defaultValue={q} aria-label="Arama" placeholder="Limon, zeytin, badem" />
        <button className="green-btn" type="submit">Ara</button>
      </form>
      {result ? <div className="product-grid" style={{ marginTop: "1rem" }}>{result.data.map((product) => <ProductCard key={product.id} product={product} />)}</div> : null}
      {q && result && result.data.length === 0 ? <p>Sonuç yok.</p> : null}
    </div>
  );
}
