"use client";

import Link from "next/link";
import { useState } from "react";
import { formatTry } from "@/lib/money";
import { useCart } from "./cart-context";
import { FavoriteButton } from "./FavoriteButton";

export type HomeProduct = {
  slug: string;
  name: string;
  image: string;
  variantId: string;
  variantLabel: string;
  priceAmount: number | null;
  seed: boolean;
};

export function HomeProductCard({ product }: { product: HomeProduct }) {
  const { add } = useCart();
  const [pending, setPending] = useState(false);
  const [note, setNote] = useState("");

  return (
    <article className="home-product">
      <div className="home-product-visual">
        <Link href={`/urunler/${product.slug}`}>
          <img src={product.image} alt={product.name} />
        </Link>
        <span className="home-badge">Yeni</span>
        <FavoriteButton slug={product.slug} appearance="icon" />
      </div>
      <div className="body">
        <h3>
          <Link href={`/urunler/${product.slug}`}>{product.name}</Link>
        </h3>
        {product.variantLabel ? <p className="meta">{product.variantLabel}</p> : null}
        <p className="home-price">
          {product.priceAmount != null ? formatTry(product.priceAmount) : "Fiyat yok"}
          {product.seed ? <small>Test fiyatı</small> : null}
        </p>
        <button
          className="home-cart"
          type="button"
          disabled={!product.variantId || pending}
          onClick={() => {
            if (!product.variantId) return;
            setPending(true);
            setNote("");
            add(product.variantId)
              .then(() => setNote("Sepete eklendi"))
              .catch((error: unknown) => setNote(error instanceof Error ? error.message : "Eklenemedi"))
              .finally(() => setPending(false));
          }}
        >
          {pending ? "Ekleniyor" : "Sepete Ekle"}
          <BagIcon />
        </button>
        {note ? <p className="meta">{note}</p> : null}
      </div>
    </article>
  );
}

function BagIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
      <path d="M6 8h12l-1 12H7L6 8z" />
      <path d="M9 8V7a3 3 0 0 1 6 0v1" />
    </svg>
  );
}
