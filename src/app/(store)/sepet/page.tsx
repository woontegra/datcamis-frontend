"use client";

import Link from "next/link";
import { useState } from "react";
import { useCart } from "@/components/store/cart-context";
import { ShippingHint, shippingLabel } from "@/components/store/ShippingHint";
import { customerMessage } from "@/lib/api";
import { productPhotoSlot } from "@/lib/home-visual";
import { formatTry } from "@/lib/money";

export default function CartPage() {
  const { cart, update, remove } = useCart();
  const [message, setMessage] = useState("");
  const empty = !cart || cart.items.length === 0;

  function run(action: Promise<void>) {
    setMessage("");
    action.catch((error: unknown) => setMessage(customerMessage(error, "Sepet güncellenemedi, lütfen tekrar deneyin.")));
  }
  const count = cart?.items.reduce((sum, item) => sum + item.quantity, 0) ?? 0;

  return (
    <div className="wrap section cart-page">
      <p className="eyebrow">Sepet</p>
      <h1>Sepetiniz {empty ? null : <span className="cart-count">{count} ürün</span>}</h1>
      {message ? <p className="error" role="alert">{message}</p> : null}
      {empty ? (
        <div className="cart-empty">
          <p>Sepetiniz boş.</p>
          <Link className="green-btn" href="/urunler">Ürünlere göz at</Link>
        </div>
      ) : (
        <div className="cart-layout">
          <div className="cart-list">
            {cart.items.map((item) => {
              const available = item.available ?? 20;
              const src = item.image?.url || productPhotoSlot(item.productSlug);
              return (
                <article className="cart-line" key={item.id}>
                  <img src={src} alt={item.image?.alt || item.productName} />
                  <div className="cart-line-info">
                    <Link href={`/urunler/${item.productSlug}`}>{item.productName}</Link>
                    <p>{item.variantName}</p>
                    <button className="cart-remove" type="button" onClick={() => run(remove(item.id))}>Kaldır</button>
                  </div>
                  <div className="cart-line-meta">
                    <div className="qty-stepper">
                      <button type="button" aria-label="Azalt" disabled={item.quantity <= 1} onClick={() => run(update(item.id, item.quantity - 1))}>-</button>
                      <span>{item.quantity}</span>
                      <button type="button" aria-label="Artır" disabled={item.quantity >= available} onClick={() => run(update(item.id, item.quantity + 1))}>+</button>
                    </div>
                    <strong>{formatTry(item.lineAmount)}</strong>
                  </div>
                </article>
              );
            })}
          </div>
          <aside className="order-summary">
            <h2>Sipariş özeti</h2>
            <div className="summary-row"><span>Ara toplam</span><span>{formatTry(cart.subtotalAmount)}</span></div>
            <div className="summary-row"><span>Kargo</span><span>{shippingLabel(cart.shippingAmount)}</span></div>
            <div className="summary-row is-total"><span>Toplam</span><span>{formatTry(cart.totalAmount ?? cart.subtotalAmount)}</span></div>
            <ShippingHint cart={cart} />
            {cart.minOrderMessage ? <p className="summary-note is-warning" role="status">{cart.minOrderMessage}</p> : null}
            <Link className="green-btn" href="/odeme">Ödemeye geç</Link>
            <Link className="summary-continue" href="/urunler">Alışverişe devam et</Link>
          </aside>
        </div>
      )}
    </div>
  );
}
