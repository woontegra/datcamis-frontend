"use client";

import { useEffect, useState } from "react";
import { ProductCard } from "@/components/store/ProductCard";
import { useFavoriteSlugs } from "@/components/store/FavoriteButton";
import { browserApi } from "@/lib/api";
import type { Product } from "@/lib/types";

export default function FavoritesPage() {
  const favoriteKey = useFavoriteSlugs().join("|");
  const [products, setProducts] = useState<Product[] | null>(null);
  useEffect(() => {
    let cancelled = false;
    const slugs = new Set(favoriteKey ? favoriteKey.split("|") : []);
    browserApi<{ data: Product[] }>("/catalog/products?pageSize=48")
      .then((body) => {
        if (!cancelled) setProducts(body.data.filter((product) => slugs.has(product.slug)));
      })
      .catch(() => {
        if (!cancelled) setProducts([]);
      });
    return () => {
      cancelled = true;
    };
  }, [favoriteKey]);
  return (
    <div className="wrap section">
      <p className="eyebrow">Seçtikleriniz</p>
      <h1>Favoriler</h1>
      {products === null ? <p>Yükleniyor…</p> : products.length === 0 ? <p>Henüz favori yok.</p> : (
        <div className="product-grid">{products.map((product) => <ProductCard key={product.id} product={product} />)}</div>
      )}
    </div>
  );
}
