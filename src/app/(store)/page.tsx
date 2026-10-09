import Link from "next/link";
import { Great_Vibes } from "next/font/google";
import { HomeProductCard, type HomeProduct } from "@/components/store/HomeProductCard";
import { displayImage } from "@/lib/home-visual";
import { defaultVariant } from "@/lib/money";
import { getProducts } from "@/lib/store";

const script = Great_Vibes({ weight: "400", subsets: ["latin", "latin-ext"], variable: "--font-script" });

const collections = [
  { id: "limon-cicegi", href: "/urunler/limon-cicegi-kolonyasi", title: "Limon Çiçeği", kicker: "Koleksiyonu", image: "/home/collection-limon.jpg", alt: "Limon ve beyaz çiçekler" },
  { id: "zeytin-cicegi", href: "/urunler/zeytin-cicegi-kolonyasi", title: "Zeytin Çiçeği", kicker: "Koleksiyonu", image: "/home/collection-zeytin.jpg", alt: "Zeytin dalı ve yapraklar" },
  { id: "badem-cicegi", href: "/urunler/badem-cicegi-kolonyasi", title: "Badem Çiçeği", kicker: "Koleksiyonu", image: "/home/collection-badem.jpg", alt: "Badem ve beyaz çiçekler" },
  { id: "yarimada", href: "/koleksiyonlar/bahce-serisi", title: "Yarımada", kicker: "Koleksiyonu", image: "/home/collection-yarimada.jpg", alt: "Datça kıyısı ve taş yapı" },
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
    <div className={`home ${script.variable}`} data-editor-id="home">
      <div className="home-mobile-grove" data-editor-id="frame.garden.mobile" aria-hidden="true">
        <img src="/home/garden-new.png" alt="" />
      </div>

      <section className="home-hero" data-editor-id="home.hero">
        <div className="home-copy" data-editor-id="home.hero.copy">
          <p className="home-kicker" data-editor-id="home.hero.kicker">Ege’nin özünden</p>
          <h1 data-editor-id="home.hero.title">
            Datça’dan
            <br />
            Teninize
            <br />
            Doğadan
            <br />
            Ruhunuza
          </h1>
          <p className="lede" data-editor-id="home.hero.text">
            Ege ve Akdeniz’in buluştuğu eşsiz yarımadadan ilham alan, %100 doğal esanslarla hazırlanan özel kolonya koleksiyonumuz.
          </p>
          <Link className="home-btn" href="/koleksiyonlar" data-editor-id="home.hero.cta">
            Koleksiyonu Keşfet <span aria-hidden="true">→</span>
          </Link>
        </div>
        <div className="home-hero-visual" data-editor-id="home.hero.visual">
          <img src="/home/hero-panel.jpg" alt="Datça kıyısı, taş zemin ve DatçaMis kolonya şişesi" data-editor-id="home.hero.photo" />
          <p className="home-script" data-editor-id="home.hero.script">
            Ege’nin
            <br />
            İlham Veren
            <br />
            Kokuları...
          </p>
        </div>
      </section>

      <ul className="home-features" data-editor-id="home.features">
        <li data-editor-id="home.features.natural">
          <LeafIcon />
          <span data-editor-id="home.features.natural.text">%100 Doğal Esanslar</span>
        </li>
        <li data-editor-id="home.features.lasting">
          <DropIcon />
          <span data-editor-id="home.features.lasting.text">Kalıcı ve Ferahlatıcı</span>
        </li>
        <li data-editor-id="home.features.place">
          <PinIcon />
          <span data-editor-id="home.features.place.text">Datça’nın Eşsiz Doğasından</span>
        </li>
        <li data-editor-id="home.features.gift">
          <GiftIcon />
          <span data-editor-id="home.features.gift.text">Özel Hediye Paketleme</span>
        </li>
      </ul>

      <section className="home-block" data-editor-id="home.collections">
        <div className="home-head">
          <h2 data-editor-id="home.collections.title">Koleksiyonlarımız</h2>
          <Link className="home-more" href="/koleksiyonlar" data-editor-id="home.collections.more">
            Tüm Koleksiyonları Gör →
          </Link>
        </div>
        <div className="home-collections" data-editor-id="home.collections.grid">
          {collections.map((item) => (
            <Link className="home-collection" key={item.id} href={item.href} data-editor-id={`home.collections.card.${item.id}`}>
              <img src={item.image} alt={item.alt} data-editor-id={`home.collections.card.${item.id}.photo`} />
              <span>
                <strong data-editor-id={`home.collections.card.${item.id}.title`}>{item.title}</strong>
                <b data-editor-id={`home.collections.card.${item.id}.kicker`}>{item.kicker}</b>
                <em data-editor-id={`home.collections.card.${item.id}.action`}>Keşfet →</em>
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section className="home-block" data-editor-id="home.products">
        <div className="home-head">
          <div>
            <p className="home-kicker" data-editor-id="home.products.kicker">Öne çıkan ürünler</p>
            <h2 data-editor-id="home.products.title">Doğanın En Saf Notaları</h2>
          </div>
          <p data-editor-id="home.products.text">Datça’nın benzersiz bitki örtüsünden ilham alan özel kolonya koleksiyonumuzla tanışın.</p>
        </div>
        {products ? (
          <div className="home-products" data-editor-id="home.products.grid">
            {products.map((product) => (
              <HomeProductCard key={product.slug} product={product} />
            ))}
          </div>
        ) : (
          <p data-editor-id="home.products.empty">Ürünler yüklenemedi.</p>
        )}
      </section>

      <section className="home-story" data-editor-id="home.story">
        <img src="/home/story-datca.jpg" alt="Datça denizi, dağlar, taş ev ve begonvil" data-editor-id="home.story.photo" />
        <div className="home-story-copy" data-editor-id="home.story.copy">
          <h2 data-editor-id="home.story.title">Datça’nın İlham Veren Doğası</h2>
          <p data-editor-id="home.story.text">
            Eşsiz yarımadanın temiz havası, zengin bitki örtüsü ve benzersiz çiçeklerinden ilham alan kokularla doğayı günlük yaşamınıza taşıyoruz.
          </p>
          <Link className="home-btn" href="/hikayemiz" data-editor-id="home.story.cta">
            Hikayemizi Keşfet <span aria-hidden="true">→</span>
          </Link>
        </div>
        <p className="home-script home-script-story" data-editor-id="home.story.script">
          Doğal
          <br />
          Sade
          <br />
          Hoşnut
          <br />
          Datça...
        </p>
      </section>

      <section className="home-promos" data-editor-id="home.promos">
        <Link href="/koleksiyonlar" data-editor-id="home.promos.card.hediye">
          <img src="/home/promo-hediye.jpg" alt="Yeşil kurdeleli hediye kutuları" data-editor-id="home.promos.card.hediye.photo" />
          <span>
            <strong data-editor-id="home.promos.card.hediye.title">Özel Hediye Paketleri</strong>
            <b data-editor-id="home.promos.card.hediye.text">Sevdiklerinize doğanın saf kokusunu hediye edin.</b>
            <em data-editor-id="home.promos.card.hediye.action">Paketleri İncele →</em>
          </span>
        </Link>
        <Link href="/urunler" data-editor-id="home.promos.card.seyahat">
          <img src="/home/promo-seyahat.jpg" alt="Seyahat boy kolonya şişeleri" data-editor-id="home.promos.card.seyahat.photo" />
          <span>
            <strong data-editor-id="home.promos.card.seyahat.title">Seyahat Boy Ürünler</strong>
            <b data-editor-id="home.promos.card.seyahat.text">Her zaman yanınızda, her yerde Datça’nın ferahlığı.</b>
            <em data-editor-id="home.promos.card.seyahat.action">Ürünleri İncele →</em>
          </span>
        </Link>
        <Link href="/hikayemiz" data-editor-id="home.promos.card.dogal">
          <img src="/home/promo-dogal.jpg" alt="Zeytin, badem ve limon" data-editor-id="home.promos.card.dogal.photo" />
          <span>
            <strong data-editor-id="home.promos.card.dogal.title">Doğal İçerikler</strong>
            <b data-editor-id="home.promos.card.dogal.text">Datça’nın bereketli topraklarından gelen bitkisel özler.</b>
            <em data-editor-id="home.promos.card.dogal.action">Daha Fazla Bilgi →</em>
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
