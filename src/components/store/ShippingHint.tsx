"use client";

import { formatTry } from "@/lib/money";
import { dispatchPhrase } from "@/lib/site-settings";
import type { CartData } from "./cart-context";
import { useSiteSettings } from "./site-settings-context";

export function shippingLabel(amount: number | undefined) {
  if (amount === undefined) return "Ödemede hesaplanır";
  return amount === 0 ? "Ücretsiz" : formatTry(amount);
}

export function ShippingHint({ cart }: { cart: CartData }) {
  const { shipping } = useSiteSettings();
  const threshold = cart.freeShippingThreshold ?? null;
  const remaining = cart.freeShippingRemaining ?? null;
  const progress = threshold && remaining !== null ? Math.min(100, Math.round(((threshold - remaining) / threshold) * 100)) : null;
  return (
    <>
      {remaining !== null && remaining > 0 ? (
        <div className="shipping-hint">
          <p><strong>{formatTry(remaining)}</strong> daha ekleyin, kargo bedava.</p>
          {progress !== null ? <span className="shipping-progress" aria-hidden="true"><span style={{ width: `${progress}%` }} /></span> : null}
        </div>
      ) : null}
      {remaining === 0 && threshold ? <p className="shipping-hint is-free">Kargonuz bedava.</p> : null}
      {shipping.dispatchTime ? <p className="summary-note">{dispatchPhrase(shipping.dispatchTime)}</p> : null}
    </>
  );
}
