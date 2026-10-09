import Link from "next/link";
import { NewsletterForm } from "./NewsletterForm";

export function Footer() {
  return (
    <footer className="footer" data-editor-id="frame.footer">
      <div className="wrap footer-grid">
        <div className="footer-brand" data-editor-id="frame.footer.brand">
          <Link href="/" className="brand-lockup">
            <img src="/home/logo-mark.jpg" alt="" width={44} height={44} data-editor-id="frame.footer.brand.mark" />
            <span>
              <strong className="brand-name" data-editor-id="frame.footer.brand.name">DATÇAMİS</strong>
              <small className="brand-tag" data-editor-id="frame.footer.brand.tag">Datça’dan Teninize Doğadan Ruhunuza</small>
            </span>
          </Link>
          <p data-editor-id="frame.footer.brand.text">Limon, zeytin ve badem. Ege kıyısından ilham alan kolonya evi.</p>
        </div>
        <div data-editor-id="frame.footer.collections">
          <p className="eyebrow" data-editor-id="frame.footer.collections.title">Koleksiyon</p>
          <p><Link href="/urunler/limon-cicegi-kolonyasi" data-editor-id="frame.footer.collections.limon-cicegi">Limon Çiçeği</Link></p>
          <p><Link href="/urunler/zeytin-cicegi-kolonyasi" data-editor-id="frame.footer.collections.zeytin-cicegi">Zeytin Çiçeği</Link></p>
          <p><Link href="/urunler/badem-cicegi-kolonyasi" data-editor-id="frame.footer.collections.badem-cicegi">Badem Çiçeği</Link></p>
          <p><Link href="/koleksiyonlar" data-editor-id="frame.footer.collections.tum-koleksiyonlar">Tüm koleksiyonlar</Link></p>
        </div>
        <div data-editor-id="frame.footer.house">
          <p className="eyebrow" data-editor-id="frame.footer.house.title">Ev</p>
          <p><Link href="/hikayemiz" data-editor-id="frame.footer.house.hikayemiz">Hikayemiz</Link></p>
          <p><Link href="/blog" data-editor-id="frame.footer.house.blog">Blog</Link></p>
          <p><Link href="/iletisim" data-editor-id="frame.footer.house.iletisim">İletişim</Link></p>
          <p><Link href="/hesap" data-editor-id="frame.footer.house.hesap">Hesap</Link></p>
        </div>
        <NewsletterForm title="Bahçeden haber" text="Yeni notlar için e-posta bırakın." editorId="frame.footer.newsletter" />
      </div>
    </footer>
  );
}
