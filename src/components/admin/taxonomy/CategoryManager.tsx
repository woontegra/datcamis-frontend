"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ApiError, browserApi } from "@/lib/api";
import { DragHandle, errorMap, Field, ImageField, type SampleProduct, SeoFields, type Seo, suggestSlug, Switch, Thumb } from "./shared";

export type AdminCategory = {
  id: string;
  name: string;
  slug: string;
  description: string;
  parentId: string | null;
  sortOrder: number;
  isVisible: boolean;
  imageMediaId: string | null;
  imageUrl: string | null;
  productCount: number;
  seo: Seo;
};

type Draft = {
  name: string;
  parentId: string;
  description: string;
  imageMediaId: string | null;
  isVisible: boolean;
  slug: string;
  seoTitle: string;
  seoDescription: string;
};

type Drop = { id: string; zone: "before" | "inside" | "after" };

const NEW = "__new__";
const SAMPLE_SHOWN = 3;
const LEAVE_TEXT = "Kaydedilmemiş değişiklikler silinsin mi?";

function toDraft(category: AdminCategory | undefined, parentId = ""): Draft {
  return {
    name: category?.name ?? "",
    parentId: category ? category.parentId ?? "" : parentId,
    description: category?.description ?? "",
    imageMediaId: category?.imageMediaId ?? null,
    isVisible: category?.isVisible ?? true,
    slug: category?.slug ?? "",
    seoTitle: category?.seo.title ?? "",
    seoDescription: category?.seo.description ?? "",
  };
}

function childrenOf(rows: AdminCategory[], parentId: string | null) {
  return rows.filter((row) => row.parentId === parentId).sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, "tr"));
}

function flatten(rows: AdminCategory[]) {
  const out: Array<{ row: AdminCategory; depth: number }> = [];
  const walk = (parentId: string | null, depth: number) => {
    for (const row of childrenOf(rows, parentId)) {
      out.push({ row, depth });
      walk(row.id, depth + 1);
    }
  };
  walk(null, 1);
  return out;
}

function depthOf(rows: AdminCategory[], id: string | null) {
  let depth = 0;
  let current = id ? rows.find((row) => row.id === id) : undefined;
  while (current && depth < 10) {
    depth += 1;
    current = current.parentId ? rows.find((row) => row.id === current!.parentId) : undefined;
  }
  return depth;
}

/** Levels below and including the category (1 = no children). */
function heightOf(rows: AdminCategory[], id: string): number {
  const kids = rows.filter((row) => row.parentId === id);
  return 1 + (kids.length ? Math.max(...kids.map((kid) => heightOf(rows, kid.id))) : 0);
}

function isInside(rows: AdminCategory[], id: string, ancestorId: string) {
  let current = rows.find((row) => row.id === id);
  while (current?.parentId) {
    if (current.parentId === ancestorId) return true;
    current = rows.find((row) => row.id === current!.parentId);
  }
  return false;
}

export function CategoryManager({ initial, canEdit, maxDepth }: { initial: AdminCategory[]; canEdit: boolean; maxDepth: number }) {
  const [rows, setRows] = useState(initial);
  const [selected, setSelected] = useState<string>(initial[0]?.id ?? NEW);
  const current = rows.find((row) => row.id === selected);
  const [draft, setDraft] = useState<Draft>(() => toDraft(current));
  const [base, setBase] = useState<Draft>(() => toDraft(current));
  const [slugTouched, setSlugTouched] = useState(Boolean(current));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [sample, setSample] = useState<{ total: number; items: SampleProduct[] } | null>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const [drop, setDrop] = useState<Drop | null>(null);

  const tree = useMemo(() => flatten(rows), [rows]);
  const dirty = JSON.stringify(draft) !== JSON.stringify(base);

  useEffect(() => {
    if (selected === NEW) return;
    let live = true;
    browserApi<{ data: SampleProduct[]; meta: { total: number } }>(`/admin/categories/${selected}/products`)
      .then((body) => { if (live) setSample({ total: body.meta.total, items: body.data }); })
      .catch(() => { if (live) setSample({ total: 0, items: [] }); });
    return () => { live = false; };
  }, [selected]);

  function open(id: string, parentId = "") {
    if (id === selected && id !== NEW) return;
    if (dirty && !window.confirm(LEAVE_TEXT)) return;
    const row = rows.find((item) => item.id === id);
    const next = toDraft(row, parentId);
    setSample(null);
    setSelected(id);
    setDraft(next);
    setBase(next);
    setSlugTouched(Boolean(row));
    setErrors({});
    setMessage(null);
  }

  function update<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((prev) => {
      const next = { ...prev, [key]: value };
      if (key === "name" && !slugTouched) next.slug = suggestSlug(String(value));
      return next;
    });
    setErrors((prev) => {
      const path = key === "seoTitle" ? "seo.title" : key === "seoDescription" ? "seo.description" : key;
      if (!prev[path]) return prev;
      const next = { ...prev };
      delete next[path];
      return next;
    });
    setMessage(null);
  }

  async function reload(keep?: string) {
    const body = await browserApi<{ data: AdminCategory[] }>("/admin/categories");
    setRows(body.data);
    const row = body.data.find((item) => item.id === keep);
    if (row) {
      const next = toDraft(row);
      setSelected(row.id);
      setDraft(next);
      setBase(next);
      setSlugTouched(true);
    }
    return body.data;
  }

  function fail(error: unknown, fallback: string) {
    if (error instanceof ApiError) {
      setErrors(errorMap(error.details));
      setMessage({ tone: "error", text: error.status === 403 ? "Kategorileri yalnızca Owner, Admin ve Editor değiştirebilir." : error.message });
    } else {
      setMessage({ tone: "error", text: fallback });
    }
  }

  async function save() {
    if (busy || !canEdit) return;
    if (draft.name.trim().length < 2) {
      setErrors({ name: "Ad en az 2 karakter olmalı." });
      return;
    }
    setBusy(true);
    setMessage(null);
    const payload = {
      name: draft.name.trim(),
      parentId: draft.parentId || null,
      description: draft.description,
      imageMediaId: draft.imageMediaId,
      isVisible: draft.isVisible,
      ...(draft.slug ? { slug: draft.slug } : {}),
      seo: { title: draft.seoTitle.trim() || null, description: draft.seoDescription.trim() || null },
    };
    try {
      const body = selected === NEW
        ? await browserApi<{ data: { id: string } }>("/admin/categories", { method: "POST", body: JSON.stringify(payload) })
        : await browserApi<{ data: { id: string } }>(`/admin/categories/${selected}`, { method: "PATCH", body: JSON.stringify(payload) });
      await reload(body.data.id);
      setErrors({});
      setMessage({ tone: "ok", text: "Kaydedildi." });
    } catch (error) {
      fail(error, "Kaydedilemedi, lütfen tekrar deneyin.");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!current || busy || !canEdit) return;
    const kids = rows.filter((row) => row.parentId === current.id).length;
    if (current.productCount || kids) {
      const reasons = [current.productCount ? `${current.productCount} ürün` : "", kids ? `${kids} alt kategori` : ""].filter(Boolean).join(" ve ");
      setMessage({ tone: "error", text: `Silinemez: bu kategoride ${reasons} var. Önce bunları başka bir kategoriye taşıyın.` });
      return;
    }
    if (!window.confirm(`“${current.name}” kategorisi silinsin mi? Bu işlem geri alınamaz.`)) return;
    setBusy(true);
    try {
      await browserApi(`/admin/categories/${current.id}`, { method: "DELETE" });
      const list = await reload();
      const next = list[0];
      const nextDraft = toDraft(next);
      setSample(null);
      setSelected(next?.id ?? NEW);
      setDraft(nextDraft);
      setBase(nextDraft);
      setSlugTouched(Boolean(next));
      setMessage({ tone: "ok", text: "Kategori silindi." });
    } catch (error) {
      fail(error, "Silinemedi, lütfen tekrar deneyin.");
    } finally {
      setBusy(false);
    }
  }

  /** Moves a category and saves the new order of the affected sibling groups. */
  async function move(id: string, parentId: string | null, index: number) {
    const moving = rows.find((row) => row.id === id);
    if (!moving || !canEdit) return;
    if (parentId && (parentId === id || isInside(rows, parentId, id))) {
      setMessage({ tone: "error", text: "Bir kategori kendi altına veya kendi alt kategorisinin altına taşınamaz." });
      return;
    }
    if (depthOf(rows, parentId) + heightOf(rows, id) > maxDepth) {
      setMessage({ tone: "error", text: `Kategoriler en fazla ${maxDepth} seviye olabilir.` });
      return;
    }
    const siblings = childrenOf(rows, parentId).filter((row) => row.id !== id);
    siblings.splice(Math.max(0, Math.min(index, siblings.length)), 0, { ...moving, parentId });
    const items = siblings.map((row, sortOrder) => ({ id: row.id, parentId, sortOrder }));
    if (moving.parentId !== parentId) {
      childrenOf(rows, moving.parentId).filter((row) => row.id !== id).forEach((row, sortOrder) => items.push({ id: row.id, parentId: row.parentId, sortOrder }));
    }
    const before = rows;
    setRows((prev) => prev.map((row) => {
      const item = items.find((entry) => entry.id === row.id);
      return item ? { ...row, parentId: item.parentId, sortOrder: item.sortOrder } : row;
    }));
    if (id === selected) {
      setDraft((prev) => ({ ...prev, parentId: parentId ?? "" }));
      setBase((prev) => ({ ...prev, parentId: parentId ?? "" }));
    }
    try {
      await browserApi("/admin/categories/tree", { method: "PUT", body: JSON.stringify({ items }) });
      setMessage({ tone: "ok", text: "Sıralama kaydedildi." });
    } catch (error) {
      setRows(before);
      fail(error, "Sıralama kaydedilemedi.");
    }
  }

  function onDrop(target: Drop) {
    const id = dragging;
    setDragging(null);
    setDrop(null);
    if (!id || id === target.id) return;
    const row = rows.find((item) => item.id === target.id);
    if (!row) return;
    if (target.zone === "inside") {
      void move(id, row.id, childrenOf(rows, row.id).length);
      return;
    }
    const siblings = childrenOf(rows, row.parentId).filter((item) => item.id !== id);
    const at = siblings.findIndex((item) => item.id === row.id);
    void move(id, row.parentId, target.zone === "before" ? at : at + 1);
  }

  function nudge(row: AdminCategory, step: -1 | 1) {
    const siblings = childrenOf(rows, row.parentId);
    const at = siblings.findIndex((item) => item.id === row.id);
    if (at + step < 0 || at + step >= siblings.length) return;
    void move(row.id, row.parentId, at + step);
  }

  const parentOptions = useMemo(() => {
    const ownHeight = current ? heightOf(rows, current.id) : 1;
    return tree.filter(({ row, depth }) => {
      if (current && (row.id === current.id || isInside(rows, row.id, current.id))) return false;
      return depth + ownHeight <= maxDepth;
    });
  }, [tree, rows, current, maxDepth]);

  const title = selected === NEW ? "Yeni kategori" : current?.name ?? "";

  return (
    <div className="tax-page">
      <div className="admin-top">
        <h1>Kategoriler</h1>
        {canEdit ? <button className="green-btn tax-new" type="button" onClick={() => open(NEW)}>+ Yeni kategori</button> : null}
      </div>
      <div className="tax-layout">
        <section className="tax-tree" aria-label="Kategori ağacı">
          <p className="tax-tree-hint">{canEdit ? "Sürükleyerek sıralayın" : "Kategoriler"}</p>
          {tree.length === 0 ? <p className="tax-empty">Henüz kategori yok.</p> : null}
          <ul>
            {tree.map(({ row, depth }) => {
              const zone = drop?.id === row.id ? drop.zone : null;
              return (
                <li
                  key={row.id}
                  className={`tax-row${row.id === selected ? " is-selected" : ""}${row.isVisible ? "" : " is-hidden"}${zone ? ` is-drop-${zone}` : ""}${dragging === row.id ? " is-dragging" : ""}`}
                  style={{ paddingLeft: `${0.5 + (depth - 1) * 1.4}rem` }}
                  draggable={canEdit}
                  onDragStart={(event) => { setDragging(row.id); event.dataTransfer.effectAllowed = "move"; event.dataTransfer.setData("text/plain", row.id); }}
                  onDragEnd={() => { setDragging(null); setDrop(null); }}
                  onDragOver={(event) => {
                    if (!dragging || dragging === row.id) return;
                    event.preventDefault();
                    const box = event.currentTarget.getBoundingClientRect();
                    const y = (event.clientY - box.top) / box.height;
                    const next: Drop["zone"] = y < 0.28 ? "before" : y > 0.72 ? "after" : "inside";
                    if (drop?.id !== row.id || drop.zone !== next) setDrop({ id: row.id, zone: next });
                  }}
                  onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node)) setDrop((prev) => (prev?.id === row.id ? null : prev)); }}
                  onDrop={(event) => { event.preventDefault(); if (drop) onDrop(drop); }}
                >
                  {canEdit ? <DragHandle /> : null}
                  <button type="button" className="tax-row-main" onClick={() => open(row.id)}>
                    <Thumb src={row.imageUrl} />
                    <span className="tax-row-name">{row.name}</span>
                    {row.isVisible ? null : <span className="tax-badge">Gizli</span>}
                    <span className="tax-row-count">{row.productCount} ürün</span>
                  </button>
                  {canEdit ? (
                    <span className="tax-nudge">
                      <button type="button" aria-label={`${row.name} yukarı`} onClick={() => nudge(row, -1)}>↑</button>
                      <button type="button" aria-label={`${row.name} aşağı`} onClick={() => nudge(row, 1)}>↓</button>
                    </span>
                  ) : null}
                </li>
              );
            })}
          </ul>
          {canEdit && tree.length ? <p className="tax-tree-foot">Bir kategoriyi başka bir kategorinin ortasına bırakırsanız onun altına taşınır. En fazla {maxDepth} seviye.</p> : null}
        </section>

        <section className="tax-panel">
          <div className="tax-panel-head">
            <h2>{title}</h2>
            {dirty ? <span className="settings-dirty">Kaydedilmedi</span> : null}
            {canEdit && current ? <button className="tax-delete" type="button" disabled={busy} onClick={() => void remove()}>Sil</button> : null}
            {canEdit ? <button className="green-btn" type="button" disabled={busy || (!dirty && selected !== NEW)} onClick={() => void save()}>{busy ? "Kaydediliyor…" : "Kaydet"}</button> : null}
          </div>
          {message ? <p className={`settings-message is-${message.tone}`} role={message.tone === "error" ? "alert" : "status"}>{message.text}</p> : null}
          {selected !== NEW && !current ? <p className="tax-empty">Soldan bir kategori seçin.</p> : (
            <fieldset className="tax-fields" disabled={!canEdit}>
              <div className="settings-row cols-2">
                <Field label="Kategori adı" error={errors.name}>
                  <input value={draft.name} maxLength={80} onChange={(event) => update("name", event.target.value)} />
                </Field>
                <Field label="Üst kategori" error={errors.parentId}>
                  <select value={draft.parentId} onChange={(event) => update("parentId", event.target.value)}>
                    <option value="">— Yok (ana kategori)</option>
                    {parentOptions.map(({ row, depth }) => (
                      <option key={row.id} value={row.id}>{`${"\u00a0\u00a0".repeat(depth - 1)}${depth > 1 ? "└ " : ""}${row.name}`}</option>
                    ))}
                  </select>
                </Field>
              </div>
              <Field label="Açıklama" error={errors.description}>
                <textarea rows={3} value={draft.description} maxLength={2000} placeholder="Kategori sayfasının üstünde görünür" onChange={(event) => update("description", event.target.value)} />
              </Field>
              <ImageField value={draft.imageMediaId} disabled={!canEdit} onChange={(id) => update("imageMediaId", id)} />
              <Switch checked={draft.isVisible} onChange={(value) => update("isVisible", value)} label="Mağazada görünür" />
              <SeoFields
                prefix="/kategoriler/"
                slug={draft.slug}
                title={draft.seoTitle}
                description={draft.seoDescription}
                namePlaceholder="Boşsa kategori adı"
                errors={errors}
                onSlug={(value) => { setSlugTouched(true); update("slug", value); }}
                onTitle={(value) => update("seoTitle", value)}
                onDescription={(value) => update("seoDescription", value)}
              />
            </fieldset>
          )}
          {current ? (
            <div className="tax-section tax-products">
              <h3>Bu kategorideki ürünler ({sample?.total ?? current.productCount})</h3>
              <p>
                {sample === null ? "Yükleniyor…" : sample.items.length === 0 ? "Bu kategoride ürün yok." : sample.items.slice(0, SAMPLE_SHOWN).map((item) => item.name).join(" · ")}
                {sample && sample.total > SAMPLE_SHOWN ? ` · +${sample.total - SAMPLE_SHOWN}` : ""}
                {" · "}
                <Link href={`/admin/urunler?category=${current.id}`}>Ürünlerde gör</Link>
              </p>
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
}
