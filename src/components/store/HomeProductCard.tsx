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
    <article className="home-product" data-editor-id={`home.products.card.${product.slug}`}>
      <div className="home-product-visual">
        <Link href={`/urunler/${product.slug}`}>
          <img src={product.image} alt={product.name} data-editor-id={`home.products.card.${product.slug}.photo`} />
        </Link>
        <span className="home-badge" data-editor-id={`home.products.card.${product.slug}.badge`}>Yeni</span>
        <FavoriteButton slug={product.slug} appearance="icon" editorId={`home.products.card.${product.slug}.favorite`} />
      </div>
      <div className="body" data-editor-id={`home.products.card.${product.slug}.body`}>
        <h3 data-editor-id={`home.products.card.${product.slug}.name`}>
          <Link href={`/urunler/${product.slug}`}>{product.name}</Link>
        </h3>
        {product.variantLabel ? <p className="meta" data-editor-id={`home.products.card.${product.slug}.variant`}>{product.variantLabel}</p> : null}
        <p className="home-price" data-editor-id={`home.products.card.${product.slug}.price`}>
          {product.priceAmount != null ? formatTry(product.priceAmount) : "Fiyat yok"}
          {product.seed ? <small>Test fiyatı</small> : null}
        </p>
        <button
          data-editor-id={`home.products.card.${product.slug}.cart`}
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
