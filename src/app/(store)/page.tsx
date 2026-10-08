import Link from "next/link";
import { Great_Vibes } from "next/font/google";
import { HomeProductCard, type HomeProduct } from "@/components/store/HomeProductCard";
import { displayImage } from "@/lib/home-visual";
import { defaultVariant } from "@/lib/money";
import { getProducts } from "@/lib/store";

const script = Great_Vibes({ weight: "400", subsets: ["latin", "latin-ext"], variable: "--font-script" });

const collections = [
  { href: "/urunler/limon-cicegi-kolonyasi", title: "Limon Çiçeği", kicker: "Koleksiyonu", image: "/home/collection-limon.jpg", alt: "Limon ve beyaz çiçekler" },
  { href: "/urunler/zeytin-cicegi-kolonyasi", title: "Zeytin Çiçeği", kicker: "Koleksiyonu", image: "/home/collection-zeytin.jpg", alt: "Zeytin dalı ve yapraklar" },
  { href: "/urunler/badem-cicegi-kolonyasi", title: "Badem Çiçeği", kicker: "Koleksiyonu", image: "/home/collection-badem.jpg", alt: "Badem ve beyaz çiçekler" },
  { href: "/koleksiyonlar/bahce-serisi", title: "Yarımada", kicker: "Koleksiyonu", image: "/home/collection-yarimada.jpg", alt: "Datça kıyısı ve taş yapı" },
];

export default async function HomePage() {
  const featured = await getProducts("?collection=one-cikanlar&pageSize=5").catch(() => null);
  const preferred = ["limon-cicegi-kolonyasi", "zeytin-cicegi-kolonyasi", "badem-cicegi-kolonyasi", "datca-bahcesi-kolonyasi", "uc-cicek-kolonyasi"];
  const products: HomeProduct[] | null = featured
    ? (await Promise.all(
        featured.data.map(async (product) => {
          const variant = defaultVariant(product);
          return {
            slug: product.slug,
            name: product.name,
            image: await displayImage(product.images[0]?.url, product.slug),
            variantId: variant?.id ?? "",
            variantLabel: variant?.name ?? "",
            priceAmount: variant?.priceAmount ?? null,
            seed: product.isSeed,
          };
        }),
      )).sort((a, b) => preferred.indexOf(a.slug) - preferred.indexOf(b.slug))
    : null;

  return (
    <div className={`home ${script.variable}`}>
      <div className="home-mobile-grove" aria-hidden="true">
        <img src="/home/garden-new.png" alt="" />
      </div>

      <section className="home-hero">
        <div className="home-copy">
          <p className="home-kicker">Ege’nin özünden</p>
          <h1>
            Datça’dan
            <br />
            Teninize
            <br />
            Doğadan
            <br />
            Ruhunuza
          </h1>
          <p className="lede">
            Ege ve Akdeniz’in buluştuğu eşsiz yarımadadan ilham alan, %100 doğal esanslarla hazırlanan özel kolonya koleksiyonumuz.
          </p>
          <Link className="home-btn" href="/koleksiyonlar">
            Koleksiyonu Keşfet <span aria-hidden="true">→</span>
          </Link>
        </div>
        <div className="home-hero-visual">
          <img src="/home/hero-panel.jpg" alt="Datça kıyısı, taş zemin ve DatçaMis kolonya şişesi" />
          <p className="home-script">
            Ege’nin
            <br />
            İlham Veren
            <br />
            Kokuları...
          </p>
        </div>
      </section>

      <ul className="home-features">
        <li>
          <LeafIcon />
          <span>%100 Doğal Esanslar</span>
        </li>
        <li>
          <DropIcon />
          <span>Kalıcı ve Ferahlatıcı</span>
        </li>
        <li>
          <PinIcon />
          <span>Datça’nın Eşsiz Doğasından</span>
        </li>
        <li>
          <GiftIcon />
          <span>Özel Hediye Paketleme</span>
        </li>
      </ul>

      <section className="home-block">
        <div className="home-head">
          <h2>Koleksiyonlarımız</h2>
          <Link className="home-more" href="/koleksiyonlar">
            Tüm Koleksiyonları Gör →
          </Link>
        </div>
        <div className="home-collections">
          {collections.map((item) => (
            <Link className="home-collection" key={item.href} href={item.href}>
              <img src={item.image} alt={item.alt} />
              <span>
                <strong>{item.title}</strong>
                {item.kicker}
                <em>Keşfet →</em>
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section className="home-block">
        <div className="home-head">
          <div>
            <p className="home-kicker">Öne çıkan ürünler</p>
            <h2>Doğanın En Saf Notaları</h2>
          </div>
          <p>Datça’nın benzersiz bitki örtüsünden ilham alan özel kolonya koleksiyonumuzla tanışın.</p>
        </div>
        {products ? (
          <div className="home-products">
            {products.map((product) => (
              <HomeProductCard key={product.slug} product={product} />
            ))}
          </div>
        ) : (
          <p>Ürünler yüklenemedi.</p>
        )}
      </section>

      <section className="home-story">
        <img src="/home/story-datca.jpg" alt="Datça denizi, dağlar, taş ev ve begonvil" />
        <div className="home-story-copy">
          <h2>Datça’nın İlham Veren Doğası</h2>
          <p>
            Eşsiz yarımadanın temiz havası, zengin bitki örtüsü ve benzersiz çiçeklerinden ilham alan kokularla doğayı günlük yaşamınıza taşıyoruz.
          </p>
          <Link className="home-btn" href="/hikayemiz">
            Hikayemizi Keşfet <span aria-hidden="true">→</span>
          </Link>
        </div>
        <p className="home-script home-script-story">
          Doğal
          <br />
          Sade
          <br />
          Hoşnut
          <br />
          Datça...
        </p>
      </section>

      <section className="home-promos">
        <Link href="/koleksiyonlar">
          <img src="/home/promo-hediye.jpg" alt="Yeşil kurdeleli hediye kutuları" />
          <span>
            <strong>Özel Hediye Paketleri</strong>
            Sevdiklerinize doğanın saf kokusunu hediye edin.
            <em>Paketleri İncele →</em>
          </span>
        </Link>
        <Link href="/urunler">
          <img src="/home/promo-seyahat.jpg" alt="Seyahat boy kolonya şişeleri" />
          <span>
            <strong>Seyahat Boy Ürünler</strong>
            Her zaman yanınızda, her yerde Datça’nın ferahlığı.
            <em>Ürünleri İncele →</em>
          </span>
        </Link>
        <Link href="/hikayemiz">
          <img src="/home/promo-dogal.jpg" alt="Zeytin, badem ve limon" />
          <span>
            <strong>Doğal İçerikler</strong>
            Datça’nın bereketli topraklarından gelen bitkisel özler.
            <em>Daha Fazla Bilgi →</em>
          </span>
        </Link>
      </section>
    </div>
  );
}

function Icon({ children }: { children: React.ReactNode }) {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true">
      {children}
    </svg>
  );
}
function LeafIcon() {
  return <Icon><path d="M5 19C14 19 19 8 19 5 12 6 6 10 5 19z" /><path d="M8 14c2-1 4-3 6-6" /></Icon>;
}
function DropIcon() {
  return <Icon><path d="M12 3s6 7 6 11a6 6 0 0 1-12 0c0-4 6-11 6-11z" /></Icon>;
}
function PinIcon() {
  return <Icon><path d="M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11z" /><circle cx="12" cy="10" r="2.2" /></Icon>;
}
function GiftIcon() {
  return <Icon><rect x="4" y="10" width="16" height="9" rx="1" /><path d="M4 10h16V8H4zM12 19V8" /><path d="M12 8c-2-3-5-3-5-1s3 1 5 1 5-1 5-1-3-2-5 1z" /></Icon>;
}
