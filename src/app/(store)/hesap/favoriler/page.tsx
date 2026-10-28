import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Favorilerim" };

export default function AccountFavorites() {
  return (
    <section className="checkout-block account-empty">
      <h2>Favorilerim</h2>
      <p>Favori ürünlerinizi kaydetme özelliği yakında eklenecek.</p>
      <Link className="text-btn" href="/urunler">Ürünlere göz at</Link>
    </section>
  );
}
