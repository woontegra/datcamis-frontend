"use client";

import Link from "next/link";
import { useCart } from "@/components/store/cart-context";
import { formatTry } from "@/lib/money";

export default function CartPage() {
  const { cart, update, remove } = useCart();
  return (
    <div className="wrap section">
      <p className="eyebrow">Sepet</p>
      <h1>Sepetiniz</h1>
      {!cart || cart.items.length === 0 ? (
        <p>Sepet boş. <Link href="/urunler">Kataloğa dön</Link></p>
      ) : (
        <>
          {cart.items.map((item) => (
            <div className="cart-row" key={item.id}>
              <div>
                <Link href={`/urunler/${item.productSlug}`}>{item.productName}</Link>
                <p style={{ margin: 0 }}>{item.variantName} {item.isSeed ? "· seed" : ""}</p>
              </div>
              <label>Adet
                <input
                  style={{ width: "4.5rem", marginLeft: "0.4rem" }}
                  type="number"
                  min={1}
                  max={20}
                  defaultValue={item.quantity}
                  onChange={(event) => update(item.id, Number(event.target.value)).catch(() => undefined)}
                />
              </label>
              <strong>{formatTry(item.lineAmount)}</strong>
              <button className="text-btn" type="button" onClick={() => remove(item.id)}>Çıkar</button>
            </div>
          ))}
          <p>Ara toplam: {formatTry(cart.subtotalAmount)} <span className="quiet-note">Test tutarı</span></p>
          <Link className="green-btn" href="/odeme">Ödemeye geç</Link>
        </>
      )}
    </div>
  );
}
