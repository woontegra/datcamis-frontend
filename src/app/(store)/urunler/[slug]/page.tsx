import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BuyBox } from "@/components/store/BuyBox";
import { FavoriteButton } from "@/components/store/FavoriteButton";
import { getProduct, orNotFound } from "@/lib/store";

function schemaPrice(amount: number) {
  const abs = Math.abs(Math.trunc(amount));
  return `${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, "0")}`;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const product = await orNotFound(() => getProduct(slug));
  if (!product) return { title: "Ürün" };
  return {
    title: product.name,
    description: product.seo?.description || product.summary,
    alternates: { canonical: product.seo?.canonicalPath || `/urunler/${product.slug}` },
    robots: { index: product.seo?.robotsIndex !== false, follow: product.seo?.robotsFollow !== false },
  };
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await orNotFound(() => getProduct(slug));
  if (!product) notFound();
  const image = product.images[0];
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.summary,
    sku: product.variants[0]?.sku,
    offers: product.variants.map((variant) => ({
      "@type": "Offer",
      priceCurrency: variant.currency,
      price: schemaPrice(variant.priceAmount),
      availability: variant.inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
    })),
  };
  return (
    <article className="wrap detail">
      <div className="detail-visual">
        {image ? <img src={image.url} alt={image.alt} /> : null}
      </div>
      <div>
        <p className="eyebrow">{product.categories.map((item) => item.name).join(" · ")}</p>
        <h1>{product.name}</h1>
        {product.isSeed ? <p className="seed-pill">Seed / test kaydı</p> : null}
        <p className="lede">{product.description}</p>
        <BuyBox variants={product.variants} />
        <FavoriteButton slug={product.slug} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      </div>
    </article>
  );
}
