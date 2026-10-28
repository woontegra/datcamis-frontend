import type { Metadata } from "next";
import Link from "next/link";
import { AccountIcon } from "@/components/account/AccountNav";
import { OrderCard } from "@/components/account/OrderCard";
import type { AccountOrderSummary, Customer } from "@/lib/account";
import { customerApi } from "@/lib/account-server";

export const metadata: Metadata = { title: "Hesabım" };

const QUICK_LINKS = [
  { href: "/hesap/siparisler", label: "Siparişlerim", text: "Durum, kargo ve havale bilgileri", icon: "box" },
  { href: "/hesap/adresler", label: "Adreslerim", text: "Teslimat adreslerinizi yönetin", icon: "pin" },
  { href: "/hesap/profil", label: "Profil bilgileri", text: "Ad, soyad ve telefon", icon: "user" },
  { href: "/hesap/sifre", label: "Şifre değiştir", text: "Hesap güvenliğiniz", icon: "lock" },
];

export default async function AccountOverview() {
  const [me, orders] = await Promise.all([
    customerApi<{ data: Customer }>("/account/me", "/hesap"),
    customerApi<{ data: AccountOrderSummary[] }>("/account/orders", "/hesap"),
  ]);
  const last = orders.data[0];
  return (
    <div className="account-stack">
      <section className="checkout-block account-welcome">
        <h2>Genel bakış</h2>
        <p>Hoş geldiniz, {me.data.firstName} {me.data.lastName}. Siparişlerinizi, adreslerinizi ve hesap bilgilerinizi buradan yönetebilirsiniz.</p>
      </section>

      <section className="account-section">
        <div className="account-section-head">
          <h2>Son siparişiniz</h2>
          {orders.data.length > 1 ? <Link href="/hesap/siparisler">Tümünü gör</Link> : null}
        </div>
        {last ? <OrderCard order={last} /> : (
          <div className="checkout-block account-empty">
            <p>Henüz siparişiniz yok.</p>
            <Link className="green-btn" href="/urunler">Alışverişe başla</Link>
          </div>
        )}
      </section>

      <section className="account-section">
        <h2>Hızlı bağlantılar</h2>
        <div className="account-quick">
          {QUICK_LINKS.map((item) => (
            <Link key={item.href} href={item.href} className="account-quick-link">
              <AccountIcon name={item.icon} />
              <span>
                <strong>{item.label}</strong>
                <small>{item.text}</small>
              </span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
