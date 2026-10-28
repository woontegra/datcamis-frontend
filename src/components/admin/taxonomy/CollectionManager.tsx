"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ApiError, browserApi } from "@/lib/api";
import { formatTry } from "@/lib/money";
import { DragHandle, errorMap, Field, ImageField, type SampleProduct, SeoFields, type Seo, suggestSlug, Switch, Thumb } from "./shared";

export type Rule =
  | { type: "category"; categoryId: string }
  | { type: "price"; min?: number | null; max?: number | null }
  | { type: "featured" }
  | { type: "onSale" }
  | { type: "newWithinDays"; days: number };

type CollectionType = "MANUAL" | "AUTOMATIC";
type ProductSort = "MANUAL" | "NEWEST" | "PRICE_ASC" | "PRICE_DESC";

export type AdminCollection = {
  id: string;
  name: string;
  slug: string;
  description: string;
  sortOrder: number;
  isVisible: boolean;
  type: CollectionType;
  productSort: ProductSort;
  rules: Rule[];
  imageMediaId: string | null;
  imageUrl: string | null;
  productCount: number;
  seo: Seo;
};

type Draft = {
  name: string;
  description: string;
  imageMediaId: string | null;
  isVisible: boolean;
  type: CollectionType;
  productSort: ProductSort;
  rules: Rule[];
  slug: string;
  seoTitle: string;
  seoDescription: string;
};

type CategoryOption = { id: string; name: string; parentId: string | null };
type SearchRow = { id: string; name: string; status: string; priceMin: number; images: Array<{ url: string }> };

const NEW = "__new__";
const LEAVE_TEXT = "Kaydedilmemiş değişiklikler silinsin mi?";
const SORT_LABELS: Record<ProductSort, string> = { MANUAL: "Elle (sizin sıranız)", NEWEST: "En yeni", PRICE_ASC: "Fiyat artan", PRICE_DESC: "Fiyat azalan" };
const RULE_LABELS: Record<Rule["type"], string> = { category: "Kategori", price: "Fiyat aralığı", featured: "Öne çıkan ürünler", onSale: "İndirimli ürünler", newWithinDays: "Son X günde eklenenler" };
const STATUS_LABELS: Record<string, string> = { DRAFT: "Taslak", ARCHIVED: "Arşiv" };

function toDraft(collection: AdminCollection | undefined): Draft {
  return {
    name: collection?.name ?? "",
    description: collection?.description ?? "",
    imageMediaId: collection?.imageMediaId ?? null,
    isVisible: collection?.isVisible ?? true,
    type: collection?.type ?? "MANUAL",
    productSort: collection?.productSort ?? "MANUAL",
    rules: collection?.rules ?? [],
    slug: collection?.slug ?? "",
    seoTitle: collection?.seo.title ?? "",
    seoDescription: collection?.seo.description ?? "",
  };
}

function newRule(type: Rule["type"], categories: CategoryOption[]): Rule {
  switch (type) {
    case "category": return { type, categoryId: categories[0]?.id ?? "" };
    case "price": return { type, min: null, max: null };
    case "newWithinDays": return { type, days: 30 };
    default: return { type };
  }
}

function ruleProblem(rule: Rule) {
  if (rule.type === "category" && !rule.categoryId) return "Kategori seçin.";
  if (rule.type === "price") {
    if (rule.min == null && rule.max == null) return "En az bir fiyat sınırı girin.";
    if (rule.min != null && rule.max != null && rule.min > rule.max) return "En düşük fiyat en yüksekten büyük olamaz.";
  }
  if (rule.type === "newWithinDays" && (!Number.isInteger(rule.days) || rule.days < 1)) return "Gün sayısı en az 1 olmalı.";
  return "";
}

function liraToKurus(value: string) {
  if (!value.trim()) return null;
  const number = Number(value.replace(",", "."));
  return Number.isFinite(number) && number >= 0 ? Math.round(number * 100) : null;
}

function kurusToLira(value: number | null | undefined) {
  return value == null ? "" : String(value / 100);
}

function categoryLabels(categories: CategoryOption[]) {
  const byId = new Map(categories.map((row) => [row.id, row]));
  return categories.map((row) => {
    const names = [row.name];
    let parent = row.parentId ? byId.get(row.parentId) : undefined;
    while (parent && names.length < 4) {
      names.unshift(parent.name);
      parent = parent.parentId ? byId.get(parent.parentId) : undefined;
    }
    return { id: row.id, label: names.join(" › ") };
  }).sort((a, b) => a.label.localeCompare(b.label, "tr"));
}

function move<T>(list: T[], from: number, to: number) {
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

export function CollectionManager({ initial, canEdit, categories }: { initial: AdminCollection[]; canEdit: boolean; categories: CategoryOption[] }) {
  const [rows, setRows] = useState(initial);
  const [selected, setSelected] = useState<string>(initial[0]?.id ?? NEW);
  const current = rows.find((row) => row.id === selected);
  const [draft, setDraft] = useState<Draft>(() => toDraft(current));
  const [base, setBase] = useState<Draft>(() => toDraft(current));
  const [products, setProducts] = useState<SampleProduct[]>([]);
  const [baseProducts, setBaseProducts] = useState<string[]>([]);
  const [slugTouched, setSlugTouched] = useState(Boolean(current));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchRow[]>([]);
  const [preview, setPreview] = useState<{ key: string; total: number; items: SampleProduct[]; error?: string } | null>(null);
  const [dragList, setDragList] = useState<string | null>(null);
  const [dragProduct, setDragProduct] = useState<number | null>(null);
  const loadedFor = useRef<string | null>(null);

  const labels = useMemo(() => categoryLabels(categories), [categories]);
  const productIds = products.map((item) => item.id);
  const dirty = JSON.stringify(draft) !== JSON.stringify(base) || (draft.type === "MANUAL" && JSON.stringify(productIds) !== JSON.stringify(baseProducts));

  useEffect(() => {
    if (selected === NEW || !current || loadedFor.current === selected) return;
    let live = true;
    browserApi<{ data: SampleProduct[] }>(`/admin/collections/${selected}/products`)
      .then((body) => {
        if (!live) return;
        loadedFor.current = selected;
        setProducts(body.data);
        setBaseProducts(body.data.map((item) => item.id));
      })
      .catch(() => undefined);
    return () => { live = false; };
  }, [selected, current]);

  useEffect(() => {
    const term = query.trim();
    if (term.length < 2) return;
    const timer = window.setTimeout(() => {
      browserApi<{ data: SearchRow[] }>(`/admin/products?q=${encodeURIComponent(term)}&pageSize=8`)
        .then((body) => setResults(body.data))
        .catch(() => setResults([]));
    }, 300);
    return () => window.clearTimeout(timer);
  }, [query]);

  const shownResults = query.trim().length >= 2 ? results : [];
  const previewKey = JSON.stringify({ rules: draft.rules, productSort: draft.productSort });
  const previewProblem = draft.type !== "AUTOMATIC"
    ? ""
    : draft.rules.length ? draft.rules.map(ruleProblem).find(Boolean) || "" : "Önizleme için en az bir kural ekleyin.";
  const shownPreview = preview?.key === previewKey ? preview : null;
  useEffect(() => {
    if (draft.type !== "AUTOMATIC" || previewProblem) return;
    const timer = window.setTimeout(() => {
      browserApi<{ data: SampleProduct[]; meta: { total: number } }>("/admin/collections/preview", { method: "POST", body: previewKey })
        .then((body) => setPreview({ key: previewKey, total: body.meta.total, items: body.data }))
        .catch((error) => setPreview({ key: previewKey, total: 0, items: [], error: error instanceof ApiError ? error.message : "Önizleme alınamadı." }));
    }, 400);
    return () => window.clearTimeout(timer);
  }, [draft.type, previewKey, previewProblem]);

  function reset(row: AdminCollection | undefined) {
    const next = toDraft(row);
    setSelected(row?.id ?? NEW);
    setDraft(next);
    setBase(next);
    setSlugTouched(Boolean(row));
    setErrors({});
    setQuery("");
    setResults([]);
    if (!row || loadedFor.current !== row.id) {
      setProducts([]);
      setBaseProducts([]);
      loadedFor.current = row ? null : NEW;
    }
  }

  function open(id: string) {
    if (id === selected && id !== NEW) return;
    if (dirty && !window.confirm(LEAVE_TEXT)) return;
    loadedFor.current = null;
    reset(rows.find((row) => row.id === id));
    setMessage(null);
  }

  function update<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((prev) => {
      const next = { ...prev, [key]: value };
      if (key === "name" && !slugTouched) next.slug = suggestSlug(String(value));
      if (key === "type" && value === "AUTOMATIC" && next.productSort === "MANUAL") next.productSort = "NEWEST";
      return next;
    });
    setErrors((prev) => (Object.keys(prev).length ? {} : prev));
    setMessage(null);
  }

  function setRule(index: number, rule: Rule) {
    update("rules", draft.rules.map((item, at) => (at === index ? rule : item)));
  }

  function fail(error: unknown, fallback: string) {
    if (error instanceof ApiError) {
      setErrors(errorMap(error.details));
      setMessage({ tone: "error", text: error.status === 403 ? "Koleksiyonları yalnızca Owner, Admin ve Editor değiştirebilir." : error.message });
    } else {
      setMessage({ tone: "error", text: fallback });
    }
  }

  async function reload() {
    const body = await browserApi<{ data: AdminCollection[] }>("/admin/collections");
    setRows(body.data);
    return body.data;
  }

  async function save() {
    if (busy || !canEdit) return;
    if (draft.name.trim().length < 2) {
      setErrors({ name: "Ad en az 2 karakter olmalı." });
      return;
    }
    if (draft.type === "AUTOMATIC") {
      const problem = draft.rules.length ? draft.rules.map(ruleProblem).find(Boolean) : "Otomatik koleksiyon için en az bir kural ekleyin.";
      if (problem) {
        setMessage({ tone: "error", text: problem });
        return;
      }
    }
    setBusy(true);
    setMessage(null);
    const payload = {
      name: draft.name.trim(),
      description: draft.description,
      imageMediaId: draft.imageMediaId,
      isVisible: draft.isVisible,
      type: draft.type,
      productSort: draft.productSort,
      ...(draft.type === "AUTOMATIC" ? { rules: draft.rules } : { productIds }),
      ...(draft.slug ? { slug: draft.slug } : {}),
      seo: { title: draft.seoTitle.trim() || null, description: draft.seoDescription.trim() || null },
    };
    try {
      const body = selected === NEW
        ? await browserApi<{ data: { id: string } }>("/admin/collections", { method: "POST", body: JSON.stringify(payload) })
        : await browserApi<{ data: { id: string } }>(`/admin/collections/${selected}`, { method: "PATCH", body: JSON.stringify(payload) });
      const list = await reload();
      loadedFor.current = body.data.id;
      setBaseProducts(productIds);
      reset(list.find((row) => row.id === body.data.id));
      setMessage({ tone: "ok", text: "Kaydedildi." });
    } catch (error) {
      fail(error, "Kaydedilemedi, lütfen tekrar deneyin.");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!current || busy || !canEdit) return;
    if (!window.confirm(`“${current.name}” koleksiyonu silinsin mi? Ürünler silinmez, yalnızca bu koleksiyondan çıkar.`)) return;
    setBusy(true);
    try {
      await browserApi(`/admin/collections/${current.id}`, { method: "DELETE" });
      const list = await reload();
      loadedFor.current = null;
      reset(list[0]);
      setMessage({ tone: "ok", text: "Koleksiyon silindi." });
    } catch (error) {
      fail(error, "Silinemedi, lütfen tekrar deneyin.");
    } finally {
      setBusy(false);
    }
  }

  async function reorder(from: number, to: number) {
    if (!canEdit || from === to || to < 0 || to >= rows.length) return;
    const before = rows;
    const next = move(rows, from, to);
    setRows(next);
    try {
      await browserApi("/admin/collections/order", { method: "PUT", body: JSON.stringify({ ids: next.map((row) => row.id) }) });
      setMessage({ tone: "ok", text: "Sıralama kaydedildi." });
    } catch (error) {
      setRows(before);
      fail(error, "Sıralama kaydedilemedi.");
    }
  }

  function addProduct(row: SearchRow) {
    if (productIds.includes(row.id)) return;
    setProducts((prev) => [...prev, { id: row.id, name: row.name, status: row.status, priceAmount: row.priceMin, imageUrl: row.images[0]?.url ?? null }]);
    setMessage(null);
  }

  const title = selected === NEW ? "Yeni koleksiyon" : current?.name ?? "";

  return (
    <div className="tax-page">
      <div className="admin-top">
        <h1>Koleksiyonlar</h1>
        {canEdit ? <button className="green-btn tax-new" type="button" onClick={() => open(NEW)}>+ Yeni koleksiyon</button> : null}
      </div>
      <div className="tax-layout">
        <section className="tax-tree" aria-label="Koleksiyon listesi">
          <p className="tax-tree-hint">{canEdit ? "Sürükleyerek sıralayın" : "Koleksiyonlar"}</p>
          {rows.length === 0 ? <p className="tax-empty">Henüz koleksiyon yok.</p> : null}
          <ul>
            {rows.map((row, index) => (
              <li
                key={row.id}
                className={`tax-row${row.id === selected ? " is-selected" : ""}${row.isVisible ? "" : " is-hidden"}${dragList === row.id ? " is-dragging" : ""}`}
                draggable={canEdit}
                onDragStart={(event) => { setDragList(row.id); event.dataTransfer.effectAllowed = "move"; event.dataTransfer.setData("text/plain", row.id); }}
                onDragEnd={() => setDragList(null)}
                onDragOver={(event) => { if (dragList && dragList !== row.id) event.preventDefault(); }}
                onDrop={(event) => {
                  event.preventDefault();
                  const from = rows.findIndex((item) => item.id === dragList);
                  setDragList(null);
                  if (from >= 0) void reorder(from, index);
                }}
              >
                {canEdit ? <DragHandle /> : null}
                <button type="button" className="tax-row-main" onClick={() => open(row.id)}>
                  <Thumb src={row.imageUrl} />
                  <span className="tax-row-name">{row.name}</span>
                  {row.type === "AUTOMATIC" ? <span className="tax-badge is-auto">Otomatik</span> : null}
                  {row.isVisible ? null : <span className="tax-badge">Gizli</span>}
                  <span className="tax-row-count">{row.productCount} ürün</span>
                </button>
                {canEdit ? (
                  <span className="tax-nudge">
                    <button type="button" aria-label={`${row.name} yukarı`} onClick={() => void reorder(index, index - 1)}>↑</button>
                    <button type="button" aria-label={`${row.name} aşağı`} onClick={() => void reorder(index, index + 1)}>↓</button>
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        </section>

        <section className="tax-panel">
          <div className="tax-panel-head">
            <h2>{title}</h2>
            {dirty ? <span className="settings-dirty">Kaydedilmedi</span> : null}
            {canEdit && current ? <button className="tax-delete" type="button" disabled={busy} onClick={() => void remove()}>Sil</button> : null}
            {canEdit ? <button className="green-btn" type="button" disabled={busy || (!dirty && selected !== NEW)} onClick={() => void save()}>{busy ? "Kaydediliyor…" : "Kaydet"}</button> : null}
          </div>
          {message ? <p className={`settings-message is-${message.tone}`} role={message.tone === "error" ? "alert" : "status"}>{message.text}</p> : null}
          {selected !== NEW && !current ? <p className="tax-empty">Soldan bir koleksiyon seçin.</p> : (
            <fieldset className="tax-fields" disabled={!canEdit}>
              <div className="settings-row cols-2">
                <Field label="Koleksiyon adı" error={errors.name}>
                  <input value={draft.name} maxLength={80} onChange={(event) => update("name", event.target.value)} />
                </Field>
                <Field label="Mağazadaki ürün sıralaması" error={errors.productSort}>
                  <select value={draft.productSort} onChange={(event) => update("productSort", event.target.value as ProductSort)}>
                    {(Object.keys(SORT_LABELS) as ProductSort[])
                      .filter((key) => draft.type === "MANUAL" || key !== "MANUAL")
                      .map((key) => <option key={key} value={key}>{SORT_LABELS[key]}</option>)}
                  </select>
                </Field>
              </div>
              <Field label="Açıklama" error={errors.description}>
                <textarea rows={3} value={draft.description} maxLength={2000} placeholder="Koleksiyon sayfasının üstünde görünür" onChange={(event) => update("description", event.target.value)} />
              </Field>
              <ImageField value={draft.imageMediaId} disabled={!canEdit} onChange={(id) => update("imageMediaId", id)} />
              <Switch checked={draft.isVisible} onChange={(value) => update("isVisible", value)} label="Mağazada görünür" />

              <div className="tax-section">
                <h3>Ürünler</h3>
                <div className="tax-segment" role="radiogroup" aria-label="Koleksiyon türü">
                  {(["MANUAL", "AUTOMATIC"] as const).map((type) => (
                    <button key={type} type="button" role="radio" aria-checked={draft.type === type} className={draft.type === type ? "is-active" : undefined} onClick={() => update("type", type)}>
                      {type === "MANUAL" ? "Elle seç" : "Otomatik (kurallar)"}
                    </button>
                  ))}
                </div>

                {draft.type === "MANUAL" ? (
                  <>
                    <div className="tax-search">
                      <input type="search" value={query} placeholder="Ürün ara (en az 2 harf)" onChange={(event) => setQuery(event.target.value)} />
                      {shownResults.length ? (
                        <ul className="tax-search-results">
                          {shownResults.map((row) => {
                            const added = productIds.includes(row.id);
                            return (
                              <li key={row.id}>
                                <button type="button" disabled={added} onClick={() => addProduct(row)}>
                                  <Thumb src={row.images[0]?.url} />
                                  <span>{row.name}</span>
                                  <small>{added ? "Eklendi" : "+ Ekle"}</small>
                                </button>
                              </li>
                            );
                          })}
                        </ul>
                      ) : null}
                    </div>
                    {products.length === 0 ? <p className="tax-empty">Bu koleksiyonda ürün yok. Yukarıdan arayıp ekleyin.</p> : (
                      <ol className="tax-picked">
                        {products.map((item, index) => (
                          <li
                            key={item.id}
                            draggable={canEdit}
                            className={dragProduct === index ? "is-dragging" : undefined}
                            onDragStart={(event) => { setDragProduct(index); event.dataTransfer.effectAllowed = "move"; event.dataTransfer.setData("text/plain", item.id); }}
                            onDragEnd={() => setDragProduct(null)}
                            onDragOver={(event) => { if (dragProduct !== null && dragProduct !== index) event.preventDefault(); }}
                            onDrop={(event) => {
                              event.preventDefault();
                              if (dragProduct !== null) setProducts((prev) => move(prev, dragProduct, index));
                              setDragProduct(null);
                            }}
                          >
                            <DragHandle />
                            <Thumb src={item.imageUrl} />
                            <span className="tax-row-name">{item.name}</span>
                            {STATUS_LABELS[item.status] ? <span className="tax-badge">{STATUS_LABELS[item.status]}</span> : null}
                            {item.priceAmount != null ? <span className="tax-row-count">{formatTry(item.priceAmount)}</span> : null}
                            <span className="tax-nudge">
                              <button type="button" aria-label={`${item.name} yukarı`} disabled={index === 0} onClick={() => setProducts((prev) => move(prev, index, index - 1))}>↑</button>
                              <button type="button" aria-label={`${item.name} aşağı`} disabled={index === products.length - 1} onClick={() => setProducts((prev) => move(prev, index, index + 1))}>↓</button>
                            </span>
                            <button type="button" className="tax-remove" aria-label={`${item.name} koleksiyondan çıkar`} onClick={() => setProducts((prev) => prev.filter((entry) => entry.id !== item.id))}>Çıkar</button>
                          </li>
                        ))}
                      </ol>
                    )}
                  </>
                ) : (
                  <>
                    <p className="settings-note">Ürün, aşağıdaki kuralların hepsine uyuyorsa koleksiyonda görünür. Yalnızca yayındaki ürünler sayılır.</p>
                    <ul className="tax-rules">
                      {draft.rules.map((rule, index) => (
                        <li key={`${index}-${rule.type}`}>
                          <select
                            value={rule.type}
                            aria-label="Kural türü"
                            onChange={(event) => setRule(index, newRule(event.target.value as Rule["type"], categories))}
                          >
                            {(Object.keys(RULE_LABELS) as Rule["type"][]).map((key) => <option key={key} value={key}>{RULE_LABELS[key]}</option>)}
                          </select>
                          {rule.type === "category" ? (
                            <select value={rule.categoryId} aria-label="Kategori" onChange={(event) => setRule(index, { ...rule, categoryId: event.target.value })}>
                              <option value="">Kategori seçin</option>
                              {labels.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
                            </select>
                          ) : null}
                          {rule.type === "price" ? (
                            <span className="tax-rule-pair">
                              <input inputMode="decimal" placeholder="En az ₺" aria-label="En düşük fiyat" defaultValue={kurusToLira(rule.min)} onChange={(event) => setRule(index, { ...rule, min: liraToKurus(event.target.value) })} />
                              <input inputMode="decimal" placeholder="En çok ₺" aria-label="En yüksek fiyat" defaultValue={kurusToLira(rule.max)} onChange={(event) => setRule(index, { ...rule, max: liraToKurus(event.target.value) })} />
                            </span>
                          ) : null}
                          {rule.type === "newWithinDays" ? (
                            <span className="tax-rule-pair">
                              <input type="number" min={1} max={3650} aria-label="Gün sayısı" value={rule.days} onChange={(event) => setRule(index, { ...rule, days: Number(event.target.value) })} />
                              <span>gün</span>
                            </span>
                          ) : null}
                          <button type="button" className="tax-remove" onClick={() => update("rules", draft.rules.filter((_, at) => at !== index))}>Kaldır</button>
                          {ruleProblem(rule) ? <span className="field-error">{ruleProblem(rule)}</span> : null}
                        </li>
                      ))}
                    </ul>
                    <button className="text-btn tax-add-rule" type="button" disabled={draft.rules.length >= 10} onClick={() => update("rules", [...draft.rules, newRule(draft.rules.length ? "featured" : "category", categories)])}>+ Kural ekle</button>
                    <div className="tax-preview" aria-live="polite">
                      {previewProblem ? <p className="settings-note">{previewProblem}</p> : shownPreview === null ? <p className="settings-note">Önizleme hazırlanıyor…</p> : shownPreview.error ? <p className="settings-note">{shownPreview.error}</p> : (
                        <>
                          <h4>Kurala uyan ürünler ({shownPreview.total})</h4>
                          {shownPreview.items.length ? (
                            <ul>
                              {shownPreview.items.map((item) => (
                                <li key={item.id}>
                                  <Thumb src={item.imageUrl} />
                                  <span>{item.name}</span>
                                  {item.priceAmount != null ? <small>{formatTry(item.priceAmount)}</small> : null}
                                </li>
                              ))}
                            </ul>
                          ) : <p className="settings-note">Şu an bu kurallara uyan ürün yok.</p>}
                          {shownPreview.total > shownPreview.items.length ? <p className="settings-note">ve {shownPreview.total - shownPreview.items.length} ürün daha</p> : null}
                        </>
                      )}
                    </div>
                  </>
                )}
              </div>

              <SeoFields
                prefix="/koleksiyonlar/"
                slug={draft.slug}
                title={draft.seoTitle}
                description={draft.seoDescription}
                namePlaceholder="Boşsa koleksiyon adı"
                errors={errors}
                onSlug={(value) => { setSlugTouched(true); update("slug", value); }}
                onTitle={(value) => update("seoTitle", value)}
                onDescription={(value) => update("seoDescription", value)}
              />
            </fieldset>
          )}
        </section>
      </div>
    </div>
  );
}
