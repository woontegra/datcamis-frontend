import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Hesap" };

export default function AccountPage() {
  return (
    <div className="wrap section">
      <p className="eyebrow">Hesap</p>
      <h1>Müşteri hesabı</h1>
      <p className="lede">Müşteri girişi sonraki aşamada açılacak. Favoriler şimdilik bu tarayıcıda durur.</p>
      <Link className="green-btn" href="/favoriler">Favorilere git</Link>
    </div>
  );
}
