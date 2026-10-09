export type EditorNodeInfo = {
  name: string;
  parent: string | null;
  locked: boolean;
};

function node(name: string, parent: string | null, locked = false): EditorNodeInfo {
  return { name, parent, locked };
}

function collectionCard(id: string, name: string): Record<string, EditorNodeInfo> {
  const base = `home.collections.card.${id}`;
  return {
    [base]: node(`${name} kartı`, "home.collections.grid"),
    [`${base}.photo`]: node("Görsel", base),
    [`${base}.title`]: node("Başlık", base),
    [`${base}.kicker`]: node("Alt yazı", base),
    [`${base}.action`]: node("Eylem", base),
  };
}

function promoCard(id: string, name: string): Record<string, EditorNodeInfo> {
  const base = `home.promos.card.${id}`;
  return {
    [base]: node(`${name} kartı`, "home.promos"),
    [`${base}.photo`]: node("Görsel", base),
    [`${base}.title`]: node("Başlık", base),
    [`${base}.text`]: node("Açıklama", base),
    [`${base}.action`]: node("Eylem", base),
  };
}

const staticNodes: Record<string, EditorNodeInfo> = {
  frame: node("Sayfa çerçevesi", null),
  "frame.garden.desktop": node("Masaüstü botanik", "frame"),
  "frame.garden.mobile": node("Mobil botanik", "frame"),
  "frame.notice": node("Fiyat duyurusu", "frame", true),
  "frame.header": node("Üst menü", "frame"),
  "frame.header.brand": node("Marka", "frame.header"),
  "frame.header.brand.mark": node("Logo", "frame.header.brand"),
  "frame.header.brand.name": node("Marka adı", "frame.header.brand"),
  "frame.header.brand.tag": node("Slogan", "frame.header.brand"),
  "frame.header.nav": node("Menü", "frame.header"),
  "frame.header.tools": node("Araçlar", "frame.header"),
  "frame.header.tools.search": node("Arama", "frame.header.tools"),
  "frame.header.tools.account": node("Hesap", "frame.header.tools"),
  "frame.header.tools.favorites": node("Favoriler", "frame.header.tools"),
  "frame.header.tools.cart": node("Sepet", "frame.header.tools", true),
  "frame.header.tools.menu": node("Menü düğmesi", "frame.header.tools"),
  "frame.header.drawer": node("Mobil menü", "frame.header"),
  "frame.main": node("Sayfa gövdesi", "frame"),
  "frame.footer": node("Alt bilgi", "frame"),
  "frame.footer.brand": node("Marka", "frame.footer"),
  "frame.footer.brand.mark": node("Logo", "frame.footer.brand"),
  "frame.footer.brand.name": node("Marka adı", "frame.footer.brand"),
  "frame.footer.brand.tag": node("Slogan", "frame.footer.brand"),
  "frame.footer.brand.text": node("Kısa tanım", "frame.footer.brand"),
  "frame.footer.collections": node("Koleksiyon sütunu", "frame.footer"),
  "frame.footer.collections.title": node("Sütun başlığı", "frame.footer.collections"),
  "frame.footer.collections.limon-cicegi": node("Limon Çiçeği", "frame.footer.collections"),
  "frame.footer.collections.zeytin-cicegi": node("Zeytin Çiçeği", "frame.footer.collections"),
  "frame.footer.collections.badem-cicegi": node("Badem Çiçeği", "frame.footer.collections"),
  "frame.footer.collections.tum-koleksiyonlar": node("Tüm koleksiyonlar", "frame.footer.collections"),
  "frame.footer.house": node("Ev sütunu", "frame.footer"),
  "frame.footer.house.title": node("Sütun başlığı", "frame.footer.house"),
  "frame.footer.house.hikayemiz": node("Hikayemiz", "frame.footer.house"),
  "frame.footer.house.blog": node("Blog", "frame.footer.house"),
  "frame.footer.house.iletisim": node("İletişim", "frame.footer.house"),
  "frame.footer.house.hesap": node("Hesap", "frame.footer.house"),
  "frame.footer.newsletter": node("Bülten", "frame.footer"),
  "frame.footer.newsletter.kicker": node("Üst yazı", "frame.footer.newsletter"),
  "frame.footer.newsletter.title": node("Başlık", "frame.footer.newsletter"),
  "frame.footer.newsletter.text": node("Açıklama", "frame.footer.newsletter"),
  "frame.footer.newsletter.email": node("E-posta alanı", "frame.footer.newsletter", true),
  "frame.footer.newsletter.submit": node("Kaydol", "frame.footer.newsletter", true),
  home: node("Ana sayfa", "frame.main"),
  "home.hero": node("Hero", "home"),
  "home.hero.copy": node("Metin kolonu", "home.hero"),
  "home.hero.kicker": node("Üst yazı", "home.hero.copy"),
  "home.hero.title": node("Başlık", "home.hero.copy"),
  "home.hero.text": node("Açıklama", "home.hero.copy"),
  "home.hero.cta": node("Buton", "home.hero.copy"),
  "home.hero.visual": node("Görsel kutu", "home.hero"),
  "home.hero.photo": node("Manzara görseli", "home.hero.visual"),
  "home.hero.script": node("El yazısı", "home.hero.visual"),
  "home.features": node("Özellik şeridi", "home"),
  "home.features.natural": node("Doğal esanslar", "home.features"),
  "home.features.natural.text": node("Metin", "home.features.natural"),
  "home.features.lasting": node("Kalıcılık", "home.features"),
  "home.features.lasting.text": node("Metin", "home.features.lasting"),
  "home.features.place": node("Datça doğası", "home.features"),
  "home.features.place.text": node("Metin", "home.features.place"),
  "home.features.gift": node("Hediye paketleme", "home.features"),
  "home.features.gift.text": node("Metin", "home.features.gift"),
  "home.collections": node("Koleksiyonlar", "home"),
  "home.collections.title": node("Başlık", "home.collections"),
  "home.collections.more": node("Tümünü gör", "home.collections"),
  "home.collections.grid": node("Kart ızgarası", "home.collections"),
  ...collectionCard("limon-cicegi", "Limon Çiçeği"),
  ...collectionCard("zeytin-cicegi", "Zeytin Çiçeği"),
  ...collectionCard("badem-cicegi", "Badem Çiçeği"),
  ...collectionCard("yarimada", "Yarımada"),
  "home.products": node("Öne çıkan ürünler", "home"),
  "home.products.kicker": node("Üst yazı", "home.products"),
  "home.products.title": node("Başlık", "home.products"),
  "home.products.text": node("Açıklama", "home.products"),
  "home.products.grid": node("Ürün ızgarası", "home.products"),
  "home.products.empty": node("Ürünler yüklenemedi", "home.products"),
  "home.story": node("Datça hikâyesi", "home"),
  "home.story.photo": node("Hikâye görseli", "home.story"),
  "home.story.copy": node("Metin kutusu", "home.story"),
  "home.story.title": node("Başlık", "home.story.copy"),
  "home.story.text": node("Açıklama", "home.story.copy"),
  "home.story.cta": node("Buton", "home.story.copy"),
  "home.story.script": node("El yazısı", "home.story"),
  "home.promos": node("Tanıtımlar", "home"),
  ...promoCard("hediye", "Hediye"),
  ...promoCard("seyahat", "Seyahat"),
  ...promoCard("dogal", "Doğal içerikler"),
};

const productPart: Record<string, { name: string; locked: boolean }> = {
  photo: { name: "Ürün görseli", locked: true },
  badge: { name: "Rozet", locked: false },
  favorite: { name: "Favori", locked: true },
  body: { name: "Metin kutusu", locked: false },
  name: { name: "Ürün adı", locked: true },
  variant: { name: "Varyant", locked: true },
  price: { name: "Fiyat", locked: true },
  cart: { name: "Sepete ekle", locked: true },
};

export function describeEditorNode(id: string): EditorNodeInfo | null {
  const known = staticNodes[id];
  if (known) return known;
  const product = id.match(/^home\.products\.card\.([a-z0-9-]+?)(?:\.(photo|badge|favorite|body|name|variant|price|cart))?$/);
  if (product) {
    const slug = product[1];
    const part = product[2];
    const card = `home.products.card.${slug}`;
    if (!part) return node("Ürün kartı", "home.products.grid");
    const info = productPart[part];
    return node(info.name, card, info.locked);
  }
  const menu = id.match(/^frame\.header\.(nav|drawer)\.([a-z0-9-]+)$/);
  if (menu) {
    const scope = menu[1];
    return node(scope === "nav" ? "Menü bağlantısı" : "Mobil menü bağlantısı", `frame.header.${scope}`);
  }
  return null;
}

export function editorMenuId(scope: "frame.header.nav" | "frame.header.drawer", href: string) {
  if (href === "/") return `${scope}.root`;
  const key = href.replace(/^\//, "").replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase();
  return `${scope}.${key || "link"}`;
}
