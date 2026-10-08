"use client";

import { useState } from "react";
import { useCart } from "./cart-context";
import { formatTry } from "@/lib/money";
import type { Variant } from "@/lib/types";

export function BuyBox({ variants }: { variants: Variant[] }) {
  const { add } = useCart();
  const [variantId, setVariantId] = useState(variants.find((item) => item.isDefault)?.id || variants[0]?.id);
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  const selected = variants.find((item) => item.id === variantId) || variants[0];
  if (!selected) return <p>Varyant yok.</p>;
  return (
    <div>
      <p><span className="quiet-note">Test fiyatı</span> {formatTry(selected.priceAmount)}</p>
      <div className="option-row" role="group" aria-label="Hacim">
        {variants.map((variant) => (
          <button key={variant.id} type="button" className="text-btn" aria-pressed={variant.id === selected.id} onClick={() => setVariantId(variant.id)}>
            {variant.name}
          </button>
        ))}
      </div>
      <p>{selected.inStock ? "Stokta" : "Tükendi"}</p>
      <button
        className="green-btn"
        type="button"
        disabled={!selected.inStock || pending}
        onClick={async () => {
          setPending(true);
          setMessage("");
          try {
            await add(selected.id, 1);
            setMessage("Sepete eklendi.");
          } catch (error) {
            setMessage(error instanceof Error ? error.message : "Eklenemedi.");
          } finally {
            setPending(false);
          }
        }}
      >
        Sepete ekle
      </button>
      {message ? <p>{message}</p> : null}
    </div>
  );
}
