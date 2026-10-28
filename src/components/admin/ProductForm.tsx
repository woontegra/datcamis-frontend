"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { browserApi } from "@/lib/api";
import { PRODUCT_STATUS_LABEL, suggestSlug, type AdminProduct } from "@/lib/products";
import { ProductMediaPicker } from "./ProductMediaPicker";
import type { MediaItem } from "@/lib/editor-images";

type Category = { id: string; name: string };
type Collection = { id: string; name: string };

function tl(amount: number) {
  return (amount / 100).toFixed(2).replace(".", ",");
}
function kurus(value: string) {
  const n = Number(value.replace(",", "."));
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.round(n * 100);
}

type ImageRow = { mediaId: string; alt: string; url: string };
type VariantRow = {
  id?: string;
  name: string;
  sku: string;
  barcode: string;
  priceTl: string;
  compareTl: string;
  weightGrams: string;
  desi: string;
  lowThreshold: string;
  disabled: boolean;
  isDefault: boolean;
  mediaId: string;
  url: string;
};

function emptyVariant(): VariantRow {
  return { name: "100 ml", sku: "", barcode: "", priceTl: "0,00", compareTl: "", weightGrams: "", desi: "", lowThreshold: "5", disabled: false, isDefault: true, mediaId: "", url: "" };
}

export function ProductForm({
  product,
  categories,
  collections,
}: {
  product?: AdminProduct;
  categories: Category[];
  collections: Collection[];
}) {
  const router = useRouter();
  const permissions = product?.permissions ?? { canEdit: true, canPrice: true, canStock: true, canArchive: true };
  const [name, setName] = useState(product?.name ?? "");
  const [slug, setSlug] = useState(product?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(Boolean(product));
  const [summary, setSummary] = useState(product?.summary ?? "");
  const [description, setDescription] = useState(product?.description ?? "");
  const [content, setContent] = useState(product?.content ?? "");
  const [usageNotes, setUsageNotes] = useState(product?.usageNotes ?? "");
  const [warningNotes, setWarningNotes] = useState(product?.warningNotes ?? "");
  const [featured, setFeatured] = useState(product?.featured ?? false);
  const [vatRate, setVatRate] = useState(product?.vatRate == null ? "" : String(product.vatRate));
  const [status, setStatus] = useState(product?.status ?? "DRAFT");
  const [categoryIds, setCategoryIds] = useState(product?.categories.map((item) => item.id) ?? []);
  const [collectionIds, setCollectionIds] = useState(product?.collections.map((item) => item.id) ?? []);
  const [images, setImages] = useState<ImageRow[]>(product?.images.map((image) => ({ mediaId: image.mediaId, alt: image.alt, url: image.url })) ?? []);
  const [variants, setVariants] = useState<VariantRow[]>(
    product?.variants.map((variant) => ({
      id: variant.id,
      name: variant.name,
      sku: variant.sku,
      barcode: variant.barcode ?? "",
      priceTl: tl(variant.priceAmount),
      compareTl: variant.compareAtAmount ? tl(variant.compareAtAmount) : "",
      weightGrams: variant.weightGrams == null ? "" : String(variant.weightGrams),
      desi: variant.desi == null ? "" : String(variant.desi).replace(".", ","),
      lowThreshold: String(variant.lowThreshold),
      disabled: variant.disabled,
      isDefault: variant.isDefault,
      mediaId: variant.image?.id ?? "",
      url: variant.image?.url ?? "",
    })) ?? [emptyVariant()],
  );
  const [seoTitle, setSeoTitle] = useState(product?.seo?.title ?? "");
  const [seoDescription, setSeoDescription] = useState(product?.seo?.description ?? "");
  const [robotsIndex, setRobotsIndex] = useState(product?.seo?.robotsIndex !== false);
  const [ogMediaId, setOgMediaId] = useState(product?.seo?.ogMediaId ?? "");
  const [message, setMessage] = useState("");
  const [dirty, setDirty] = useState(false);
  const [stockQty, setStockQty] = useState("1");
  const [stockReason, setStockReason] = useState("");

  useEffect(() => {
    const onLeave = (event: BeforeUnloadEvent) => {
      if (!dirty) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", onLeave);
    return () => window.removeEventListener("beforeunload", onLeave);
  }, [dirty]);

  const previewTitle = seoTitle || name || "Ürün adı";
  const previewPath = `datcamis.com/urunler/${slug || suggestSlug(name) || "urun"}`;
  const previewDesc = seoDescription || summary || "Açıklama";

  const payload = useMemo(() => ({
    name,
    slug: slug || suggestSlug(name),
    summary,
    description,
    content,
    usageNotes,
    warningNotes,
    featured,
    vatRate: vatRate === "" ? null : Number(vatRate),
    status,
    categoryIds,
    collectionIds,
    images: images.map((image, sortOrder) => ({ mediaId: image.mediaId, alt: image.alt, sortOrder })),
    variants: variants.map((variant, index) => ({
      id: variant.id,
      name: variant.name,
      sku: variant.sku,
      barcode: variant.barcode || null,
      priceAmount: kurus(variant.priceTl),
      compareAtAmount: (() => {
        if (!variant.compareTl.trim()) return null;
        const compare = kurus(variant.compareTl);
        return compare > kurus(variant.priceTl) ? compare : null;
      })(),
      weightGrams: variant.weightGrams.trim() === "" ? null : Math.round(Number(variant.weightGrams.replace(",", "."))),
      desi: variant.desi.trim() ? Number(variant.desi.replace(",", ".")) : null,
      position: index,
      mediaId: variant.mediaId || null,
      isDefault: variant.isDefault || index === 0,
      disabled: variant.disabled,
      lowThreshold: Number(variant.lowThreshold) || 0,
    })),
    seo: { title: seoTitle || null, description: seoDescription || null, robotsIndex, ogMediaId: ogMediaId || null },
  }), [name, slug, summary, description, content, usageNotes, warningNotes, featured, vatRate, status, categoryIds, collectionIds, images, variants, seoTitle, seoDescription, robotsIndex, ogMediaId]);

  function mark<T>(setter: (value: T) => void) {
    return (value: T) => {
      setDirty(true);
      setter(value);
    };
  }

  async function save() {
    setMessage("");
    try {
      if (product) await browserApi(`/admin/products/${product.id}`, { method: "PATCH", body: JSON.stringify(payload) });
      else {
        const created = await browserApi<{ data: { id: string } }>("/admin/products", { method: "POST", body: JSON.stringify(payload) });
        setDirty(false);
        router.push(`/admin/urunler/${created.data.id}`);
        router.refresh();
        return;
      }
      setDirty(false);
      router.refresh();
      setMessage("Kaydedildi.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Kaydedilemedi.");
    }
  }

  async function stock(action: "in" | "out" | "adjust", variantId: string) {
    if (!product) return;
    setMessage("");
    try {
      await browserApi(`/admin/products/${product.id}/stock`, {
        method: "POST",
        body: JSON.stringify({ variantId, action, quantity: Number(stockQty), reason: stockReason || "Panel stok işlemi" }),
      });
      router.refresh();
      setMessage("Stok güncellendi.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Stok güncellenemedi.");
    }
  }

  function addImage(item: MediaItem) {
    setDirty(true);
    setImages((rows) => [...rows, { mediaId: item.id, alt: item.alt || name, url: item.url }]);
  }

  if (!permissions.canEdit && product) {
    return <p>Bu ürünü düzenleme yetkiniz yok. Yalnızca görüntüleyebilirsiniz.</p>;
  }

  return (
    <div className="product-form">
      {message ? <p className={message === "Kaydedildi." || message === "Stok güncellendi." ? "order-manual" : "error"}>{message}</p> : null}

      <section className="panel-admin">
        <strong>Genel</strong>
        <div className="form-grid two" style={{ marginTop: "0.6rem" }}>
          <label className="field">Ürün adı<input value={name} onChange={(event) => { mark(setName)(event.target.value); if (!slugTouched) setSlug(suggestSlug(event.target.value)); }} /></label>
          <label className="field">Slug<input value={slug} onChange={(event) => { setSlugTouched(true); mark(setSlug)(event.target.value); }} /></label>
          <label className="field">Kısa açıklama<textarea className="order-note" value={summary} onChange={(event) => mark(setSummary)(event.target.value)} /></label>
          <label className="field">Uzun açıklama<textarea className="order-note" value={description} onChange={(event) => mark(setDescription)(event.target.value)} /></label>
          <label className="field">İçerik<textarea className="order-note" value={content} onChange={(event) => mark(setContent)(event.target.value)} /></label>
          <label className="field">Kullanım<textarea className="order-note" value={usageNotes} onChange={(event) => mark(setUsageNotes)(event.target.value)} /></label>
          <label className="field">Uyarı<textarea className="order-note" value={warningNotes} onChange={(event) => mark(setWarningNotes)(event.target.value)} /></label>
        </div>
        <label className="field" style={{ marginTop: "0.5rem" }}>
          <input type="checkbox" checked={featured} disabled={!permissions.canPrice} onChange={(event) => mark(setFeatured)(event.target.checked)} /> Öne çıkan ürün
        </label>
      </section>

      <section className="panel-admin" style={{ marginTop: "0.7rem" }}>
        <strong>Görseller</strong>
        <p className="order-manual">İlk görsel ana görseldir. Sıra için yukarı/aşağı kullanın.</p>
        {images.map((image, index) => (
          <article className="admin-card" key={`${image.mediaId}-${index}`} style={{ marginTop: "0.4rem" }}>
            <img src={image.url} alt={image.alt} style={{ width: 72, height: 72, objectFit: "cover" }} />
            <input value={image.alt} onChange={(event) => { setDirty(true); setImages((rows) => rows.map((row, i) => i === index ? { ...row, alt: event.target.value } : row)); }} placeholder="Alt metin" />
            <div className="order-actions">
              <button type="button" className="text-btn" onClick={() => { if (index === 0) return; setDirty(true); setImages((rows) => { const next = [...rows]; [next[index - 1], next[index]] = [next[index], next[index - 1]]; return next; }); }}>Yukarı</button>
              <button type="button" className="text-btn" onClick={() => { setDirty(true); setImages((rows) => rows.filter((_, i) => i !== index)); }}>Kaldır</button>
            </div>
          </article>
        ))}
        <ProductMediaPicker onPick={addImage} />
      </section>

      <section className="panel-admin" style={{ marginTop: "0.7rem" }}>
        <strong>Varyantlar</strong>
        <p className="order-manual">Fiyatlar KDV dahildir. İndirim öncesi fiyat, satış fiyatından yüksek olmalıdır; boşsa çizili fiyat gösterilmez.</p>
        {variants.map((variant, index) => (
          <article className="admin-card" key={variant.id || `new-${index}`} style={{ marginTop: "0.5rem" }}>
            <div className="form-grid two">
              <label className="field">Ad<input value={variant.name} disabled={!permissions.canPrice} onChange={(event) => { setDirty(true); setVariants((rows) => rows.map((row, i) => i === index ? { ...row, name: event.target.value } : row)); }} /></label>
              <label className="field">SKU<input value={variant.sku} disabled={!permissions.canPrice} onChange={(event) => { setDirty(true); setVariants((rows) => rows.map((row, i) => i === index ? { ...row, sku: event.target.value } : row)); }} /></label>
              <label className="field">Barkod<input value={variant.barcode} disabled={!permissions.canPrice} onChange={(event) => { setDirty(true); setVariants((rows) => rows.map((row, i) => i === index ? { ...row, barcode: event.target.value } : row)); }} /></label>
              <label className="field">Satış fiyatı (KDV dahil)<input value={variant.priceTl} disabled={!permissions.canPrice} onChange={(event) => { setDirty(true); setVariants((rows) => rows.map((row, i) => i === index ? { ...row, priceTl: event.target.value } : row)); }} /></label>
              <label className="field">İndirim öncesi fiyat (üstü çizili)<input value={variant.compareTl} disabled={!permissions.canPrice} onChange={(event) => { setDirty(true); setVariants((rows) => rows.map((row, i) => i === index ? { ...row, compareTl: event.target.value } : row)); }} /></label>
              <label className="field">Ağırlık (gram)<input value={variant.weightGrams} disabled={!permissions.canPrice} onChange={(event) => { setDirty(true); setVariants((rows) => rows.map((row, i) => i === index ? { ...row, weightGrams: event.target.value } : row)); }} /></label>
              <label className="field">Desi<input value={variant.desi} disabled={!permissions.canPrice} onChange={(event) => { setDirty(true); setVariants((rows) => rows.map((row, i) => i === index ? { ...row, desi: event.target.value } : row)); }} /></label>
              <label className="field">Kritik stok<input value={variant.lowThreshold} disabled={!permissions.canPrice} onChange={(event) => { setDirty(true); setVariants((rows) => rows.map((row, i) => i === index ? { ...row, lowThreshold: event.target.value } : row)); }} /></label>
            </div>
            <label className="field"><input type="checkbox" checked={variant.disabled} disabled={!permissions.canPrice} onChange={(event) => { setDirty(true); setVariants((rows) => rows.map((row, i) => i === index ? { ...row, disabled: event.target.checked } : row)); }} /> Pasif varyant</label>
            <p className="order-manual">Varyant görseli (isteğe bağlı)</p>
            {variant.url ? <img src={variant.url} alt="" style={{ width: 56, height: 56, objectFit: "cover" }} /> : null}
            <ProductMediaPicker onPick={(item) => { setDirty(true); setVariants((rows) => rows.map((row, i) => i === index ? { ...row, mediaId: item.id, url: item.url } : row)); }} />
            {product && permissions.canStock && variant.id ? (
              <div className="order-actions">
                <span>Elde: {product.variants.find((item) => item.id === variant.id)?.onHand ?? 0}</span>
                <input value={stockQty} onChange={(event) => setStockQty(event.target.value)} style={{ width: "4rem" }} />
                <input value={stockReason} onChange={(event) => setStockReason(event.target.value)} placeholder="Sebep notu" />
                <button type="button" className="text-btn" onClick={() => void stock("in", variant.id!)}>Stok ekle</button>
                <button type="button" className="text-btn" onClick={() => void stock("out", variant.id!)}>Stok düş</button>
                <button type="button" className="text-btn" onClick={() => void stock("adjust", variant.id!)}>Sayım düzeltmesi</button>
              </div>
            ) : null}
          </article>
        ))}
        {permissions.canPrice ? <button type="button" className="text-btn" style={{ marginTop: "0.5rem" }} onClick={() => { setDirty(true); setVariants((rows) => [...rows, { ...emptyVariant(), isDefault: false }]); }}>Varyant ekle</button> : null}
      </section>

      <section className="split" style={{ marginTop: "0.7rem" }}>
        <article className="panel-admin">
          <strong>Kategori ve koleksiyon</strong>
          <p className="order-manual">Mevcut kayıtlardan seçin.</p>
          {categories.map((category) => (
            <label key={category.id} className="field">
              <input type="checkbox" checked={categoryIds.includes(category.id)} onChange={(event) => { setDirty(true); setCategoryIds((ids) => event.target.checked ? [...ids, category.id] : ids.filter((id) => id !== category.id)); }} /> {category.name}
            </label>
          ))}
          {collections.map((collection) => (
            <label key={collection.id} className="field">
              <input type="checkbox" checked={collectionIds.includes(collection.id)} onChange={(event) => { setDirty(true); setCollectionIds((ids) => event.target.checked ? [...ids, collection.id] : ids.filter((id) => id !== collection.id)); }} /> {collection.name}
            </label>
          ))}
        </article>
        <article className="panel-admin">
          <strong>Fiyat ve vergi</strong>
          <p className="order-manual">Satış fiyatları KDV dahildir. KDV oranı boş bırakılabilir; varsayılan uydurulmaz.</p>
          <label className="field">KDV oranı (%)<input value={vatRate} disabled={!permissions.canPrice} onChange={(event) => mark(setVatRate)(event.target.value)} /></label>
          <label className="field">Durum
            <select value={status} onChange={(event) => mark(setStatus)(event.target.value)}>
              {Object.entries(PRODUCT_STATUS_LABEL).filter(([key]) => key !== "ARCHIVED" || permissions.canArchive).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </label>
        </article>
      </section>

      <section className="panel-admin" style={{ marginTop: "0.7rem" }}>
        <strong>SEO</strong>
        <div className="form-grid two">
          <label className="field">SEO başlığı<input value={seoTitle} onChange={(event) => mark(setSeoTitle)(event.target.value)} maxLength={70} /></label>
          <label className="field">SEO açıklaması<textarea className="order-note" value={seoDescription} onChange={(event) => mark(setSeoDescription)(event.target.value)} /></label>
        </div>
        <label className="field"><input type="checkbox" checked={robotsIndex} onChange={(event) => mark(setRobotsIndex)(event.target.checked)} /> Google’da listelensin (index)</label>
        <p className="order-manual">Paylaşım görseli</p>
        <ProductMediaPicker onPick={(item) => mark(setOgMediaId)(item.id)} />
        {ogMediaId ? <p className="order-manual">Seçili paylaşım görseli kaydedilecek.</p> : null}
        <div className="seo-preview">
          <p className="seo-preview-title">{previewTitle}</p>
          <p className="seo-preview-url">{previewPath}</p>
          <p className="seo-preview-desc">{previewDesc}</p>
        </div>
      </section>

      {product?.history?.length ? (
        <section className="panel-admin" style={{ marginTop: "0.7rem" }}>
          <strong>Geçmiş</strong>
          <ol className="order-history">
            {product.history.map((item) => (
              <li key={item.createdAt + item.action}><span>{new Date(item.createdAt).toLocaleString("tr-TR")} · {item.actorName}</span>{item.text}</li>
            ))}
          </ol>
        </section>
      ) : null}

      <div className="order-actions" style={{ marginTop: "0.8rem" }}>
        <button className="green-btn" type="button" onClick={() => void save()}>Kaydet</button>
        {product && permissions.canPrice ? (
          <button className="text-btn" type="button" onClick={async () => {
            const copied = await browserApi<{ data: { id: string } }>(`/admin/products/${product.id}/copy`, { method: "POST" });
            router.push(`/admin/urunler/${copied.data.id}`);
          }}>Kopyala</button>
        ) : null}
      </div>
    </div>
  );
}
