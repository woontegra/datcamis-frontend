import type { Metadata } from "next";
import Link from "next/link";
import { OrderCard } from "@/components/account/OrderCard";
import type { AccountOrderSummary } from "@/lib/account";
import { customerApi } from "@/lib/account-server";

export const metadata: Metadata = { title: "Siparişlerim" };

export default async function AccountOrders() {
  const orders = await customerApi<{ data: AccountOrderSummary[] }>("/account/orders", "/hesap/siparisler");
  return (
    <section className="account-section">
      <h2>Siparişlerim</h2>
      {orders.data.length ? (
        <div className="account-orders">
          {orders.data.map((order) => <OrderCard key={order.id} order={order} />)}
        </div>
      ) : (
        <div className="checkout-block account-empty">
          <p>Henüz siparişiniz yok.</p>
          <Link className="green-btn" href="/urunler">Alışverişe başla</Link>
        </div>
      )}
    </section>
  );
}
