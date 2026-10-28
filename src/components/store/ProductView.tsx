"use client";

import { useState } from "react";
import type { StoreOptionGroup, Variant } from "@/lib/types";
import { BuyBox } from "./BuyBox";

export function ProductView({
  image,
  variants,
  options,
  children,
  after,
}: {
  image: { url: string; alt: string } | null;
  variants: Variant[];
  options?: StoreOptionGroup[];
  children: React.ReactNode;
  after?: React.ReactNode;
}) {
  const [variantImage, setVariantImage] = useState<{ url: string; alt: string } | null>(() => {
    const start = options?.length ? variants.find((item) => item.isDefault && item.inStock) ?? variants.find((item) => item.inStock) : variants.find((item) => item.isDefault) ?? variants[0];
    return start?.image ?? null;
  });
  const shown = variantImage ?? image;
  return (
    <>
      <div className="detail-visual">{shown ? <img src={shown.url} alt={shown.alt} /> : null}</div>
      <div>
        {children}
        <BuyBox variants={variants} options={options} onVariantChange={(variant) => setVariantImage(variant?.image ?? null)} />
        {after}
      </div>
    </>
  );
}
