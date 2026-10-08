import Link from "next/link";
import { NewsletterForm } from "./NewsletterForm";

export function Footer() {
  return (
    <footer className="footer">
      <div className="wrap footer-grid">
        <div className="footer-brand">
          <Link href="/" className="brand-lockup">
            <img src="/home/logo-mark.jpg" alt="" width={44} height={44} />
            <span>
              <strong className="brand-name">DATÇAMİS</strong>
              <small className="brand-tag">Datça’dan Teninize Doğadan Ruhunuza</small>
            </span>
          </Link>
          <p>Limon, zeytin ve badem. Ege kıyısından ilham alan kolonya evi.</p>
        </div>
        <div>
          <p className="eyebrow">Koleksiyon</p>
          <p><Link href="/urunler/limon-cicegi-kolonyasi">Limon Çiçeği</Link></p>
          <p><Link href="/urunler/zeytin-cicegi-kolonyasi">Zeytin Çiçeği</Link></p>
          <p><Link href="/urunler/badem-cicegi-kolonyasi">Badem Çiçeği</Link></p>
          <p><Link href="/koleksiyonlar">Tüm koleksiyonlar</Link></p>
        </div>
        <div>
          <p className="eyebrow">Ev</p>
          <p><Link href="/hikayemiz">Hikayemiz</Link></p>
          <p><Link href="/blog">Blog</Link></p>
          <p><Link href="/iletisim">İletişim</Link></p>
          <p><Link href="/hesap">Hesap</Link></p>
        </div>
        <NewsletterForm title="Bahçeden haber" text="Yeni notlar için e-posta bırakın." />
      </div>
    </footer>
  );
}
