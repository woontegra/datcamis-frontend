"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { browserApi } from "@/lib/api";
import { PRODUCT_STATUS_LABEL, suggestSlug, type AdminProduct } from "@/lib/products";
import { ProductMediaPicker } from "./ProductMediaPicker";
import type { MediaItem } from "@/lib/editor-images";
import { activeGroups, combinations, comboLabel, MAX_PRODUCT_OPTIONS, planRows, type OptionPick } from "@/lib/variant-options";
import type { AdminAttribute } from "./attributes/AttributeManager";

const VAT_RATES = [1, 10, 20] as const;
const DEFAULT_NEW_VAT_RATE = 20;
const VAT_REQUIRED_TEXT = "KDV oranı seçin: %1, %10 veya %20.";

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
  valueIds: string[];
};

function emptyVariant(): VariantRow {
  return { name: "Standart", sku: "", barcode: "", priceTl: "0,00", compareTl: "", weightGrams: "", desi: "", lowThreshold: "5", disabled: false, isDefault: true, mediaId: "", url: "", valueIds: [] };
}

function skuPart(value: string) {
  return suggestSlug(value).toUpperCase();
}

export function ProductForm({
  product,
  categories,
  collections,
  attributes = [],
}: {
  product?: AdminProduct;
  categories: Category[];
  collections: Collection[];
  attributes?: AdminAttribute[];
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
  const [vatRate, setVatRate] = useState(() => {
    const initial = product ? product.vatRate : DEFAULT_NEW_VAT_RATE;
    return initial != null && (VAT_RATES as readonly number[]).includes(initial) ? String(initial) : "";
  });
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
      valueIds: variant.optionValueIds ?? [],
    })) ?? [emptyVariant()],
  );
  const legacyOptions = Boolean(product?.options?.some((option) => !option.attributeId));
  const [picks, setPicks] = useState<OptionPick[]>(() =>
    legacyOptions
      ? []
      : (product?.options ?? []).map((option) => ({ attributeId: option.attributeId!, valueIds: option.values.map((value) => value.attributeValueId!).filter(Boolean) })),
  );
  const [addingOption, setAddingOption] = useState(false);
  const [samePrice, setSamePrice] = useState({ price: "", compare: "" });
  const groups = activeGroups(picks, attributes);
  const hasOptions = groups.length > 0;
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
      optionValueIds: variant.valueIds,
    })),
    ...(legacyOptions ? {} : { options: picks.map((pick) => ({ attributeId: pick.attributeId, valueIds: pick.valueIds })) }),
    seo: { title: seoTitle || null, description: seoDescription || null, robotsIndex, ogMediaId: ogMediaId || null },
  }), [name, slug, summary, description, content, usageNotes, warningNotes, featured, vatRate, status, categoryIds, collectionIds, images, variants, picks, legacyOptions, seoTitle, seoDescription, robotsIndex, ogMediaId]);

  function changePicks(next: OptionPick[]) {
    const before = activeGroups(picks, attributes);
    const after = activeGroups(next, attributes);
    if (!before.length && !after.length) {
      setPicks(next);
      setDirty(true);
      return;
    }
    const template = variants[0] ?? emptyVariant();
    const base = skuPart(slug || name) || "URUN";
    const combos = after.length ? combinations(after.map((group) => group.valueIds)) : [];
    const plan = planRows(variants, before.length > 0, combos, (combo) => ({
      ...emptyVariant(),
      priceTl: template.priceTl,
      compareTl: template.compareTl,
      weightGrams: template.weightGrams,
      desi: template.desi,
      lowThreshold: template.lowThreshold,
      isDefault: false,
      sku: [base, ...combo.map((id) => skuPart(attributes.flatMap((item) => item.values).find((value) => value.id === id)?.name ?? ""))].join("-"),
      valueIds: combo,
    }));
    if (plan.removed.length) {
      const list = plan.removed.map((row) => `• ${row.name}`).join("\n");
      const ok = window.confirm(
        `Şu varyantlar üründen kaldırılacak:\n${list}\n\nSiparişi olan varyant silinmez, pasife alınır. Değişiklik “Kaydet” ile uygulanır. Devam edilsin mi?`,
      );
      if (!ok) return;
    }
    setPicks(next);
    setVariants(
      plan.rows.map((row, index) => ({
        ...row,
        name: row.valueIds.length ? comboLabel(row.valueIds, attributes) : row.name,
        isDefault: after.length ? index === 0 : row.isDefault,
      })),
    );
    setDirty(true);
  }

  function applySamePrice() {
    if (!samePrice.price.trim()) return;
    setDirty(true);
    setVariants((rows) => rows.map((row) => ({ ...row, priceTl: samePrice.price.trim(), compareTl: samePrice.compare.trim() })));
  }

  function mark<T>(setter: (value: T) => void) {
    return (value: T) => {
      setDirty(true);
      setter(value);
    };
  }

  async function save() {
    setMessage("");
    if (permissions.canPrice && !vatRate) {
      setMessage(VAT_REQUIRED_TEXT);
      return;
    }
    const emptyPick = picks.find((pick) => !pick.valueIds.length);
    if (emptyPick) {
      setMessage(`“${attributes.find((item) => item.id === emptyPick.attributeId)?.name ?? "Seçenek"}” için en az bir değer işaretleyin veya seçeneği kaldırın.`);
      return;
    }
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

        {legacyOptions ? (
          <p className="summary-note is-warning">Bu ürünün seçenekleri eski biçimde. Seçenekleri düzenlemek için önce varyant aktarım betiğinin çalıştırılması gerekir.</p>
        ) : (
          <div className="pf-options">
            {picks.map((pick) => {
              const attribute = attributes.find((item) => item.id === pick.attributeId);
              if (!attribute) return null;
              return (
                <div className="pf-option" key={pick.attributeId}>
                  <div className="pf-option-head">
                    <strong>{attribute.name}</strong>
                    {permissions.canPrice ? (
                      <button type="button" className="attr-remove" onClick={() => changePicks(picks.filter((item) => item.attributeId !== pick.attributeId))}>Seçeneği kaldır</button>
                    ) : null}
                  </div>
                  <div className="pf-option-values">
                    {attribute.values.map((value) => (
                      <label key={value.id} className={`pf-chip${pick.valueIds.includes(value.id) ? " is-on" : ""}`}>
                        <input
                          type="checkbox"
                          checked={pick.valueIds.includes(value.id)}
                          disabled={!permissions.canPrice}
                          onChange={(event) =>
                            changePicks(
                              picks.map((item) =>
                                item.attributeId === pick.attributeId
                                  ? { ...item, valueIds: event.target.checked ? [...item.valueIds, value.id] : item.valueIds.filter((id) => id !== value.id) }
                                  : item,
                              ),
                            )
                          }
                        />
                        {attribute.displayType === "SWATCH" ? <span className="pf-dot" style={{ background: value.colorHex || "#cccccc" }} aria-hidden="true" /> : null}
                        {value.name}
                      </label>
                    ))}
                    {!attribute.values.length ? <span className="settings-note">Bu özelliğin değeri yok; Varyantlar sayfasından ekleyin.</span> : null}
                  </div>
                </div>
              );
            })}
            {permissions.canPrice && picks.length < MAX_PRODUCT_OPTIONS ? (
              addingOption ? (
                <label className="field pf-option-add">Seçenek seç
                  <select
                    defaultValue=""
                    onChange={(event) => {
                      if (!event.target.value) return;
                      changePicks([...picks, { attributeId: event.target.value, valueIds: [] }]);
                      setAddingOption(false);
                    }}
                  >
                    <option value="" disabled>Özellik seçin</option>
                    {attributes.filter((item) => !picks.some((pick) => pick.attributeId === item.id)).map((item) => (
                      <option key={item.id} value={item.id}>{item.name} ({item.values.length} değer)</option>
                    ))}
                  </select>
                </label>
              ) : (
                <div className="order-actions">
                  <button type="button" className="text-btn" onClick={() => setAddingOption(true)} disabled={!attributes.length}>+ Seçenek ekle</button>
                  <Link className="pf-manage" href="/admin/varyantlar">Varyant seçeneklerini yönet</Link>
                </div>
              )
            ) : null}
            {hasOptions ? (
              <p className="order-manual">
                {groups.map((group) => `${group.attribute.name} (${group.valueIds.length})`).join(" × ")} = {variants.filter((row) => row.valueIds.length).length} varyant
              </p>
            ) : null}
          </div>
        )}

        {permissions.canPrice && variants.length > 1 ? (
          <div className="pf-same-price">
            <span>Tüm varyantlara aynı fiyatı uygula</span>
            <input value={samePrice.price} placeholder="Satış fiyatı" aria-label="Satış fiyatı" onChange={(event) => setSamePrice({ ...samePrice, price: event.target.value })} />
            <input value={samePrice.compare} placeholder="İndirim öncesi (isteğe bağlı)" aria-label="İndirim öncesi fiyat" onChange={(event) => setSamePrice({ ...samePrice, compare: event.target.value })} />
            <button type="button" className="text-btn" onClick={applySamePrice} disabled={!samePrice.price.trim()}>Uygula</button>
          </div>
        ) : null}

        {variants.map((variant, index) => (
          <article className={`admin-card${hasOptions && !variant.valueIds.length ? " pf-leftover" : ""}`} key={variant.id || `new-${variant.valueIds.join("-") || index}`} style={{ marginTop: "0.5rem" }}>
            {hasOptions ? (
              <p className="pf-variant-title">
                <strong>{variant.name}</strong>
                {!variant.valueIds.length ? <span className="settings-note"> · Seçeneği kaldırıldı; siparişi olduğu için pasif tutuluyor.</span> : null}
              </p>
            ) : null}
            <div className="form-grid two">
              {!hasOptions ? (
                <label className="field">Ad<input value={variant.name} disabled={!permissions.canPrice} onChange={(event) => { setDirty(true); setVariants((rows) => rows.map((row, i) => i === index ? { ...row, name: event.target.value } : row)); }} /></label>
              ) : null}
              <label className="field">SKU<input value={variant.sku} disabled={!permissions.canPrice} onChange={(event) => { setDirty(true); setVariants((rows) => rows.map((row, i) => i === index ? { ...row, sku: event.target.value } : row)); }} /></label>
              <label className="field">Barkod<input value={variant.barcode} disabled={!permissions.canPrice} onChange={(event) => { setDirty(true); setVariants((rows) => rows.map((row, i) => i === index ? { ...row, barcode: event.target.value } : row)); }} /></label>
              <label className="field">Satış fiyatı (KDV dahil)<input value={variant.priceTl} disabled={!permissions.canPrice} onChange={(event) => { setDirty(true); setVariants((rows) => rows.map((row, i) => i === index ? { ...row, priceTl: event.target.value } : row)); }} /></label>
              <label className="field">İndirim öncesi fiyat (üstü çizili)<input value={variant.compareTl} disabled={!permissions.canPrice} onChange={(event) => { setDirty(true); setVariants((rows) => rows.map((row, i) => i === index ? { ...row, compareTl: event.target.value } : row)); }} /></label>
              <label className="field">Ağırlık (gram)<input value={variant.weightGrams} disabled={!permissions.canPrice} onChange={(event) => { setDirty(true); setVariants((rows) => rows.map((row, i) => i === index ? { ...row, weightGrams: event.target.value } : row)); }} /></label>
              <label className="field">Desi<input value={variant.desi} disabled={!permissions.canPrice} onChange={(event) => { setDirty(true); setVariants((rows) => rows.map((row, i) => i === index ? { ...row, desi: event.target.value } : row)); }} /></label>
              <label className="field">Kritik stok<input value={variant.lowThreshold} disabled={!permissions.canPrice} onChange={(event) => { setDirty(true); setVariants((rows) => rows.map((row, i) => i === index ? { ...row, lowThreshold: event.target.value } : row)); }} /></label>
            </div>
            <label className="field"><input type="checkbox" checked={variant.disabled || (hasOptions && !variant.valueIds.length)} disabled={!permissions.canPrice || (hasOptions && !variant.valueIds.length)} onChange={(event) => { setDirty(true); setVariants((rows) => rows.map((row, i) => i === index ? { ...row, disabled: event.target.checked } : row)); }} /> Pasif varyant</label>
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
        {permissions.canPrice && !hasOptions ? <button type="button" className="text-btn" style={{ marginTop: "0.5rem" }} onClick={() => { setDirty(true); setVariants((rows) => [...rows, { ...emptyVariant(), isDefault: false }]); }}>Varyant ekle</button> : null}
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
          <p className="order-manual">Satış fiyatları KDV dahildir. Siparişteki KDV bu orana göre hesaplanır.</p>
          <label className="field">KDV oranı
            <select value={vatRate} required disabled={!permissions.canPrice} onChange={(event) => mark(setVatRate)(event.target.value)}>
              {vatRate === "" ? <option value="" disabled>Seçin</option> : null}
              {VAT_RATES.map((rate) => <option key={rate} value={rate}>%{rate}</option>)}
            </select>
          </label>
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
