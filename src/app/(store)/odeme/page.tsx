"use client";

import { useState } from "react";
import { useCart } from "@/components/store/cart-context";
import { browserApi } from "@/lib/api";
import { formatTry } from "@/lib/money";

export default function CheckoutPage() {
  const { cart, refresh } = useCart();
  const [message, setMessage] = useState("");
  const [orderNumber, setOrderNumber] = useState("");

  return (
    <div className="wrap section">
      <p className="eyebrow">Ödeme</p>
      <h1>Teslimat</h1>
      <p className="lede">Ödeme ve kargo sağlayıcıları henüz bağlı değil. Sipariş beklemede kayda geçer; tahsilat yapılmaz.</p>
      <div className="split">
        <form
          className="form-grid two"
          onSubmit={async (event) => {
            event.preventDefault();
            const data = new FormData(event.currentTarget);
            const shippingAddress = {
              fullName: String(data.get("fullName") || ""),
              phone: String(data.get("phone") || ""),
              line1: String(data.get("line1") || ""),
              district: String(data.get("district") || ""),
              city: String(data.get("city") || ""),
              postalCode: String(data.get("postalCode") || ""),
              country: "TR",
            };
            setMessage("");
            try {
              const token = localStorage.getItem("dm_cart_token");
              const result = await browserApi<{ data: { number: string } }>("/checkout", {
                method: "POST",
                headers: { "x-cart-token": token || "" },
                body: JSON.stringify({ email: data.get("email"), shippingAddress }),
              });
              setOrderNumber(result.data.number);
              await refresh();
            } catch (error) {
              setMessage(error instanceof Error ? error.message : "Sipariş oluşmadı.");
            }
          }}
        >
          <label className="field">E-posta<input name="email" type="email" required /></label>
          <label className="field">Ad soyad<input name="fullName" required minLength={3} /></label>
          <label className="field">Telefon<input name="phone" required minLength={10} /></label>
          <label className="field">Adres<input name="line1" required minLength={3} /></label>
          <label className="field">İlçe<input name="district" required /></label>
          <label className="field">İl<input name="city" required /></label>
          <label className="field">Posta kodu<input name="postalCode" required minLength={4} /></label>
          <button className="green-btn" type="submit">Siparişi kaydet</button>
        </form>
        <aside className="panel">
          <h2>Özet</h2>
          {cart?.items.map((item) => <p key={item.id}>{item.productName} × {item.quantity}</p>)}
          <strong>{formatTry(cart?.subtotalAmount || 0)}</strong>
          {orderNumber ? <p>Sipariş no: {orderNumber}. Ödeme durumu: beklemede.</p> : null}
          {message ? <p className="error">{message}</p> : null}
        </aside>
      </div>
    </div>
  );
}
