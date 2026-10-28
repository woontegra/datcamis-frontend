import Link from "next/link";
import { defaultVariant } from "@/lib/money";
import { Price } from "@/components/store/Price";
import type { Product } from "@/lib/types";

export function ProductCard({ product }: { product: Product }) {
  const variant = defaultVariant(product);
  const image = product.images[0];
  return (
    <article className="product-card">
      <Link href={`/urunler/${product.slug}`}>
        {image ? <img src={image.url} alt={image.alt} /> : <div style={{ aspectRatio: "4 / 5", background: "#efe6d2" }} />}
      </Link>
      <div className="body">
        <div style={{ display: "flex", justifyContent: "space-between", gap: "0.5rem" }}>
          <p className="eyebrow" style={{ margin: 0 }}>{product.categories[0]?.name || "Kolonya"}</p>
          {product.isSeed ? <span className="seed-pill">Seed</span> : null}
        </div>
        <h3><Link href={`/urunler/${product.slug}`}>{product.name}</Link></h3>
        <p style={{ margin: 0, color: "var(--muted)" }}>{product.summary}</p>
        <p style={{ margin: "0.6rem 0 0" }}>{variant ? <><span className="quiet-note">Fiyat</span> <Price amount={variant.priceAmount} compareAtAmount={variant.compareAtAmount} /></> : "Fiyat yok"}</p>
      </div>
    </article>
  );
}
