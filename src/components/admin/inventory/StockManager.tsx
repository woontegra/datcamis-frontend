"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { ApiError, browserApi } from "@/lib/api";
import { formatWhenShort } from "@/lib/orders";
import { errorMap, Thumb } from "../taxonomy/shared";

export type StockItem = {
  variantId: string;
  productId: string;
  productName: string;
  name: string;
  sku: string;
  onHand: number;
  reserved: number;
  lowThreshold: number;
  state: "out" | "low" | "ok";
  imageUrl: string | null;
};

export type StockPayload = {
  data: StockItem[];
  meta: {
    page: number;
    pageSize: number;
    total: number;
    canEdit: boolean;
    summary: { out: number; low: number; totalUnits: number };
    reasons: Array<{ value: string; label: string }>;
  };
};

type Action = "" | "in" | "out" | "count";
type Entry = { action: Action; quantity: string; reason: string; note: string };
type Movement = {
  id: string;
  createdAt: string;
  productId: string;
  productName: string;
  variantName: string;
  sku: string;
  delta: number | null;
  quantity: number;
  balanceAfter: number | null;
  reason: string;
  by: string;
  order: { id: string; number: string | null } | null;
};
type MovementFilters = { q: string; reason: string; from: string; to: string };
type StockFilter = { q: string; state: "all" | "out" | "low"; category: string };
type BulkOperation =
  | { type: "stock"; action: Exclude<Action, "">; quantity: number; reason: string; note: string }
  | { type: "threshold"; lowThreshold: number };
type BulkSummary = {
  matched: number;
  applicable: number;
  skipped: number;
  unchanged: number;
  missing: number;
  skippedRows: Array<{ id: string; label: string; sku: string; onHand: number }>;
};
type Notice = { kind: "ok" | "error"; text: string };

const PAGE_SIZE = 50;
const ACTIONS: Array<{ value: Action; label: string }> = [
  { value: "", label: "Seçin" },
  { value: "in", label: "Stok ekle" },
  { value: "out", label: "Stok düş" },
  { value: "count", label: "Sayım" },
];
const STATE_FILTERS: Array<{ value: StockFilter["state"]; label: string }> = [
  { value: "all", label: "Tümü" },
  { value: "out", label: "Tükenenler" },
  { value: "low", label: "Kritikler" },
];
const DEFAULT_REASON: Record<Exclude<Action, "">, string> = { in: "production", out: "damage", count: "count" };
const EMPTY_ENTRY: Entry = { action: "", quantity: "", reason: "", note: "" };
const EMPTY_FILTER: StockFilter = { q: "", state: "all", category: "" };

function readEntry(entry: Entry, onHand: number) {
  if (!entry.action) return null;
  if (!/^\d+$/.test(entry.quantity.trim())) return { error: "Adet yazın." };
  const quantity = Number(entry.quantity);
  if (entry.action !== "count" && quantity < 1) return { error: "Adet 1 veya daha büyük olmalı." };
  if (entry.action === "out" && quantity > onHand) return { error: "Stok sıfırın altına düşemez." };
  if (entry.reason === "other" && !entry.note.trim()) return { error: "“Diğer” için kısa bir not yazın." };
  const after = entry.action === "in" ? onHand + quantity : entry.action === "out" ? onHand - quantity : quantity;
  return { quantity, after };
}

function signed(value: number) {
  return value > 0 ? `+${value}` : String(value);
}

function filterParams(filter: StockFilter) {
  return {
    ...(filter.q.trim() ? { q: filter.q.trim() } : {}),
    ...(filter.state !== "all" ? { state: filter.state } : {}),
    ...(filter.category ? { category: filter.category } : {}),
  };
}

function operationText(operation: BulkOperation, count: number) {
  if (operation.type === "threshold") return `${count} ürünün kritik eşiği ${operation.lowThreshold} olacak`;
  if (operation.action === "in") return `${count} ürüne +${operation.quantity} stok eklenecek`;
  if (operation.action === "out") return `${count} üründen ${operation.quantity} stok düşülecek`;
  return `${count} ürünün stoku sayımla ${operation.quantity} olarak ayarlanacak`;
}

function summaryText(operation: BulkOperation, data: BulkSummary) {
  const parts = [operationText(operation, data.applicable)];
  if (data.skipped) parts.push(`${data.skipped} ürün sıfırın altına ineceği için atlanacak`);
  if (data.unchanged) parts.push(`${data.unchanged} ürün zaten bu değerde, değişmeyecek`);
  if (data.missing) parts.push(`${data.missing} ürünün stok kaydı yok, atlanacak`);
  return `${parts.join(", ")}.`;
}

function StateBadge({ state }: { state: StockItem["state"] }) {
  if (state === "out") return <span className="inv-badge is-out">Tükendi</span>;
  if (state === "low") return <span className="inv-badge is-low">Kritik</span>;
  return null;
}

export function StockManager({ initial, categories }: { initial: StockPayload; categories: Array<{ id: string; label: string }> }) {
  const [stock, setStock] = useState(initial);
  const [tab, setTab] = useState<"status" | "movements">("status");
  const [entries, setEntries] = useState<Record<string, Entry>>({});
  const [thresholds, setThresholds] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [conflicts, setConflicts] = useState<Record<string, string>>({});
  const [filter, setFilter] = useState<StockFilter>(EMPTY_FILTER);
  const [loaded, setLoaded] = useState<StockFilter>(EMPTY_FILTER);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<Notice | null>(null);

  const [selected, setSelected] = useState<string[]>([]);
  const [allMatching, setAllMatching] = useState(false);
  const [bulk, setBulk] = useState<Entry & { action: Exclude<Action, ""> }>({ action: "in", quantity: "", reason: "production", note: "" });
  const [bulkThreshold, setBulkThreshold] = useState("");
  const [bulkNotice, setBulkNotice] = useState<Notice | null>(null);
  const [bulkSummary, setBulkSummary] = useState<{ operation: BulkOperation; data: BulkSummary; fingerprint: string } | null>(null);
  const [bulkBusy, setBulkBusy] = useState(false);

  const [movements, setMovements] = useState<{
    rows: Movement[];
    page: number;
    total: number;
    pageSize: number;
    reasons: Array<{ value: string; label: string }>;
    filters: MovementFilters;
  } | null>(null);
  const [filters, setFilters] = useState<MovementFilters>({ q: "", reason: "", from: "", to: "" });
  const [loadingMovements, setLoadingMovements] = useState(false);
  const [movementError, setMovementError] = useState("");

  const requestId = useRef(0);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(searchTimer.current), []);

  const { canEdit, summary, reasons, page, total } = stock.meta;
  const rows = stock.data;
  const pages = Math.max(1, Math.ceil(total / stock.meta.pageSize));
  const byId = useMemo(() => new Map(rows.map((item) => [item.variantId, item])), [rows]);

  const pending = useMemo(() => {
    const items = Object.entries(entries).filter(([, entry]) => entry.action);
    const changedThresholds = Object.entries(thresholds).filter(([id, value]) => {
      const item = byId.get(id);
      return item && value.trim() !== "" && Number(value) !== item.lowThreshold;
    });
    return { items, thresholds: changedThresholds, count: items.length + changedThresholds.length };
  }, [entries, thresholds, byId]);

  useEffect(() => {
    if (!pending.count) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [pending.count]);

  const isSelected = (id: string) => allMatching || selected.includes(id);
  const pageAll = rows.length > 0 && rows.every((item) => isSelected(item.variantId));
  const selectionCount = allMatching ? total : selected.length;

  function clearSelection() {
    setSelected([]);
    setAllMatching(false);
    setBulkSummary(null);
    setBulkNotice(null);
  }

  function discardEdits() {
    setEntries({});
    setThresholds({});
    setErrors({});
    setConflicts({});
  }

  /** Unsaved row edits belong to the visible page; leaving it drops them after confirmation. */
  function leavePage() {
    if (pending.count && !window.confirm("Kaydedilmemiş stok değişiklikleri kaybolacak. Devam edilsin mi?")) return false;
    discardEdits();
    clearSelection();
    return true;
  }

  async function loadPage(target: number, next: StockFilter = loaded) {
    const id = ++requestId.current;
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(target), pageSize: String(PAGE_SIZE), ...filterParams(next) });
      const fresh = await browserApi<StockPayload>(`/admin/stock?${params.toString()}`);
      if (id !== requestId.current) return null;
      setStock(fresh);
      setLoaded(next);
      return fresh;
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }

  async function reloadStock() {
    const fresh = await loadPage(page);
    if (fresh && !fresh.data.length && fresh.meta.page > 1) return loadPage(1);
    return fresh;
  }

  function changeFilter(patch: Partial<StockFilter>, delay = 0) {
    if (!leavePage()) return;
    const next = { ...filter, ...patch };
    setFilter(next);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      loadPage(1, next).catch(() => setMessage({ kind: "error", text: "Liste yüklenemedi." }));
    }, delay);
  }

  function goToPage(target: number) {
    if (!leavePage()) return;
    loadPage(target).catch(() => setMessage({ kind: "error", text: "Liste yüklenemedi." }));
  }

  function clearRowMarks(variantId: string) {
    const drop = (current: Record<string, string>) => {
      if (!current[variantId]) return current;
      const next = { ...current };
      delete next[variantId];
      return next;
    };
    setErrors(drop);
    setConflicts(drop);
  }

  function setEntry(item: StockItem, patch: Partial<Entry>) {
    setEntries((current) => {
      const base = current[item.variantId] ?? EMPTY_ENTRY;
      const next = { ...base, ...patch };
      if (patch.action !== undefined && patch.action !== base.action) {
        next.reason = patch.action ? DEFAULT_REASON[patch.action] : "";
        if (!patch.action) next.quantity = "";
      }
      return { ...current, [item.variantId]: next };
    });
    clearRowMarks(item.variantId);
    setMessage(null);
  }

  /* Selection */

  function toggleRow(id: string) {
    setBulkSummary(null);
    if (allMatching) {
      setAllMatching(false);
      setSelected(rows.map((item) => item.variantId).filter((item) => item !== id));
      return;
    }
    setSelected((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  }

  function togglePage() {
    if (pageAll) clearSelection();
    else {
      setSelected(rows.map((item) => item.variantId));
      setBulkSummary(null);
    }
  }

  function selectAllMatching() {
    setAllMatching(true);
    setBulkSummary(null);
    setBulkNotice(null);
  }

  /* Bulk actions */

  function changeBulk(patch: Partial<typeof bulk>) {
    setBulk((current) => {
      const next = { ...current, ...patch };
      if (patch.action && patch.action !== current.action) next.reason = DEFAULT_REASON[patch.action];
      return next;
    });
    setBulkSummary(null);
    setBulkNotice(null);
  }

  function readBulk(): BulkOperation | string {
    if (!/^\d+$/.test(bulk.quantity.trim())) return "Adet yazın.";
    const quantity = Number(bulk.quantity);
    if (bulk.action !== "count" && quantity < 1) return "Adet 1 veya daha büyük olmalı.";
    if (bulk.reason === "other" && !bulk.note.trim()) return "“Diğer” için kısa bir not yazın.";
    return { type: "stock", action: bulk.action, quantity, reason: bulk.reason, note: bulk.note.trim() };
  }

  function readBulkThreshold(): BulkOperation | string {
    if (!/^\d+$/.test(bulkThreshold.trim())) return "Kritik eşik için 0 veya daha büyük bir tam sayı yazın.";
    return { type: "threshold", lowThreshold: Number(bulkThreshold) };
  }

  function run(operation: BulkOperation | string) {
    if (typeof operation === "string") {
      setBulkNotice({ kind: "error", text: operation });
      return;
    }
    if (allMatching) previewAll(operation);
    else if (operation.type === "stock") fillRows(operation);
    else fillThresholds(operation.lowThreshold);
  }

  /** Fills the selected rows only; saving stays with “Değişiklikleri kaydet”. */
  function fillRows(operation: Extract<BulkOperation, { type: "stock" }>) {
    const skipped: Record<string, string> = {};
    const filled: string[] = [];
    for (const id of selected) {
      const item = byId.get(id);
      if (!item) continue;
      if (operation.action === "out" && operation.quantity > item.onHand) {
        skipped[id] = `Uygulanmadı: mevcut ${item.onHand}, düşülecek ${operation.quantity}; stok sıfırın altına inemez.`;
      } else filled.push(id);
    }
    setEntries((current) => {
      const next = { ...current };
      for (const id of filled) next[id] = { action: operation.action, quantity: String(operation.quantity), reason: operation.reason, note: operation.note };
      return next;
    });
    const dropFilled = (current: Record<string, string>) => {
      const next = { ...current };
      for (const id of filled) delete next[id];
      return next;
    };
    setErrors((current) => ({ ...dropFilled(current), ...skipped }));
    setConflicts(dropFilled);
    setMessage(null);
    const skippedCount = Object.keys(skipped).length;
    const text = [
      filled.length ? `${filled.length} satıra dolduruldu; kontrol edip “Değişiklikleri kaydet” ile kaydedin.` : "",
      skippedCount ? `${skippedCount} satır stok sıfırın altına ineceği için uygulanmadı (kırmızı işaretli).` : "",
    ].filter(Boolean).join(" ");
    setBulkNotice({ kind: skippedCount ? "error" : "ok", text });
  }

  function fillThresholds(lowThreshold: number) {
    setThresholds((current) => {
      const next = { ...current };
      for (const id of selected) if (byId.has(id)) next[id] = String(lowThreshold);
      return next;
    });
    setErrors((current) => {
      const next = { ...current };
      for (const id of selected) delete next[id];
      return next;
    });
    setMessage(null);
    setBulkNotice({ kind: "ok", text: `${selected.length} satırın kritik eşiği ${lowThreshold} olarak dolduruldu; kontrol edip “Değişiklikleri kaydet” ile kaydedin.` });
  }

  async function previewAll(operation: BulkOperation) {
    setBulkBusy(true);
    setBulkNotice(null);
    setBulkSummary(null);
    try {
      const body = await browserApi<{ data: BulkSummary; meta: { fingerprint: string } }>("/admin/stock/bulk", {
        method: "POST",
        body: JSON.stringify({ filter: filterParams(loaded), operation }),
      });
      setBulkSummary({ operation, data: body.data, fingerprint: body.meta.fingerprint });
    } catch (error) {
      setBulkNotice({ kind: "error", text: error instanceof ApiError ? error.message : "Özet alınamadı." });
    } finally {
      setBulkBusy(false);
    }
  }

  async function confirmAll() {
    if (!bulkSummary) return;
    const { operation, fingerprint } = bulkSummary;
    setBulkBusy(true);
    setBulkNotice(null);
    try {
      const body = await browserApi<{ data: BulkSummary & { applied: number } }>("/admin/stock/bulk", {
        method: "POST",
        body: JSON.stringify({ filter: filterParams(loaded), operation, apply: true, fingerprint }),
      });
      clearSelection();
      setMovements(null);
      await reloadStock();
      const skipped = body.data.skipped ? ` ${body.data.skipped} ürün sıfırın altına ineceği için atlandı.` : "";
      setMessage({ kind: "ok", text: `${body.data.applied} ürüne uygulandı.${skipped}` });
    } catch (error) {
      if (error instanceof ApiError && error.code === "STOCK_CHANGED") {
        await previewAll(operation);
        await reloadStock().catch(() => null);
        setBulkNotice({ kind: "error", text: error.message });
      } else setBulkNotice({ kind: "error", text: error instanceof ApiError ? error.message : "Uygulanamadı." });
    } finally {
      setBulkBusy(false);
    }
  }

  /* Save */

  async function save() {
    const rowErrors: Record<string, string> = {};
    const items = pending.items.flatMap(([variantId, entry]) => {
      const item = byId.get(variantId);
      if (!item) return [];
      const parsed = readEntry(entry, item.onHand);
      if (parsed && "error" in parsed) {
        rowErrors[variantId] = parsed.error!;
        return [];
      }
      return [{ variantId, action: entry.action, quantity: parsed!.quantity, reason: entry.reason, note: entry.note.trim(), expectedOnHand: item.onHand }];
    });
    for (const [variantId, value] of pending.thresholds) {
      if (!/^\d+$/.test(value.trim())) rowErrors[variantId] = "Kritik eşik 0 veya daha büyük bir tam sayı olmalı.";
    }
    if (Object.keys(rowErrors).length) {
      setErrors(rowErrors);
      setMessage({ kind: "error", text: "Kırmızı işaretli satırları düzeltin." });
      return;
    }
    setSaving(true);
    setMessage(null);
    setConflicts({});
    try {
      const body = await browserApi<{ data: { movements: number; thresholds: number } }>("/admin/stock/batch", {
        method: "POST",
        body: JSON.stringify({
          items,
          thresholds: pending.thresholds.map(([variantId, value]) => ({ variantId, lowThreshold: Number(value) })),
        }),
      });
      discardEdits();
      clearSelection();
      setMovements(null);
      await reloadStock();
      const parts = [body.data.movements ? `${body.data.movements} stok işlemi` : "", body.data.thresholds ? `${body.data.thresholds} kritik eşik` : ""].filter(Boolean);
      setMessage({ kind: "ok", text: `${parts.join(" ve ")} kaydedildi.` });
    } catch (error) {
      if (error instanceof ApiError && error.code === "STOCK_CHANGED") {
        setConflicts(errorMap(error.details));
        await reloadStock().catch(() => null);
        setMessage({ kind: "error", text: `${error.message} Sarı işaretli satırlarda güncel stok gösteriliyor.` });
      } else if (error instanceof ApiError) {
        setErrors(errorMap(error.details));
        setMessage({ kind: "error", text: error.message });
      } else setMessage({ kind: "error", text: "Kaydedilemedi." });
    } finally {
      setSaving(false);
    }
  }

  /* Movements */

  async function loadMovements(target: number, next: MovementFilters = filters) {
    setLoadingMovements(true);
    setMovementError("");
    const params = new URLSearchParams({ page: String(target), pageSize: "30" });
    for (const [key, value] of Object.entries(next)) if (value) params.set(key, value);
    try {
      const body = await browserApi<{ data: Movement[]; meta: { page: number; pageSize: number; total: number; reasons: Array<{ value: string; label: string }> } }>(
        `/admin/stock/movements?${params.toString()}`,
      );
      setMovements({ rows: body.data, page: body.meta.page, total: body.meta.total, pageSize: body.meta.pageSize, reasons: body.meta.reasons, filters: next });
    } catch (error) {
      setMovementError(error instanceof ApiError ? error.message : "Hareketler yüklenemedi.");
    } finally {
      setLoadingMovements(false);
    }
  }

  function openTab(next: "status" | "movements") {
    setTab(next);
    if (next === "movements" && !movements && !loadingMovements) loadMovements(1);
  }

  const movementPages = movements ? Math.max(1, Math.ceil(movements.total / movements.pageSize)) : 1;
  const reasonOptions = movements?.reasons ?? [...reasons, { value: "order", label: "Sipariş kaynaklı" }];
  const showBar = canEdit && tab === "status" && selectionCount > 0;
  const filtered = Boolean(loaded.q.trim() || loaded.state !== "all" || loaded.category);

  return (
    <div className={`inv-page${showBar ? " has-selbar" : ""}`}>
      <div className="admin-top inv-top">
        <h1>Stok</h1>
        {canEdit ? (
          <button className="green-btn inv-save" type="button" onClick={save} disabled={!pending.count || saving}>
            {saving ? "Kaydediliyor…" : `Değişiklikleri kaydet${pending.count ? ` (${pending.count})` : ""}`}
          </button>
        ) : null}
      </div>

      <div className="inv-summary">
        <div className="inv-metric is-out"><span>Tükenen</span><strong>{summary.out}</strong></div>
        <div className="inv-metric is-low"><span>Kritik stok</span><strong>{summary.low}</strong></div>
        <div className="inv-metric"><span>Toplam stok</span><strong>{summary.totalUnits.toLocaleString("tr-TR")} <small>adet</small></strong></div>
      </div>

      <div className="tax-segment inv-tabs" role="tablist">
        <button type="button" role="tab" aria-selected={tab === "status"} className={tab === "status" ? "is-active" : undefined} onClick={() => openTab("status")}>Stok durumu</button>
        <button type="button" role="tab" aria-selected={tab === "movements"} className={tab === "movements" ? "is-active" : undefined} onClick={() => openTab("movements")}>Stok hareketleri</button>
      </div>

      {message ? <p className={`settings-message is-${message.kind}`} role={message.kind === "error" ? "alert" : "status"}>{message.text}</p> : null}

      {tab === "status" ? (
        <section className="panel-admin inv-card">
          <div className="inv-toolbar">
            <input type="search" value={filter.q} placeholder="Ürün, varyant veya SKU ara" aria-label="Stokta ara" onChange={(event) => changeFilter({ q: event.target.value }, 350)} />
            <select value={filter.state} aria-label="Stok durumu" onChange={(event) => changeFilter({ state: event.target.value as StockFilter["state"] })}>
              {STATE_FILTERS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
            <select value={filter.category} aria-label="Kategori" onChange={(event) => changeFilter({ category: event.target.value })}>
              <option value="">Tüm kategoriler</option>
              {categories.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
            </select>
            {canEdit && rows.length ? (
              <label className="menu-check inv-selectall-m">
                <input type="checkbox" checked={pageAll} onChange={togglePage} />
                Sayfadakileri seç
              </label>
            ) : null}
            {!canEdit ? <p className="settings-note">Stoku yalnızca Owner ve Admin değiştirebilir.</p> : null}
          </div>

          {showBar ? (
            <section className="inv-selbar" aria-label="Toplu işlem">
              <div className="inv-selbar-head">
                <strong>{allMatching ? `Filtreye uyan ${total} ürünün tümü seçildi` : `${selected.length} ürün seçildi`}</strong>
                {!allMatching && pageAll && total > rows.length ? (
                  <button className="text-btn" type="button" onClick={selectAllMatching}>Filtreye uyan {total} ürünün tümünü seç</button>
                ) : null}
              </div>
              {allMatching && pending.count ? (
                <p className="settings-note">Tümüne uygulamadan önce tablodaki değişiklikleri kaydedin.</p>
              ) : (
                <>
                  <div className="inv-selbar-row">
                    <select value={bulk.action} aria-label="Toplu işlem" onChange={(event) => changeBulk({ action: event.target.value as Exclude<Action, ""> })}>
                      {ACTIONS.filter((action) => action.value).map((action) => <option key={action.value} value={action.value}>{action.label}</option>)}
                    </select>
                    <span className="inv-qty">
                      <span aria-hidden="true">{bulk.action === "in" ? "+" : bulk.action === "out" ? "−" : "="}</span>
                      <input inputMode="numeric" value={bulk.quantity} placeholder={bulk.action === "count" ? "Sayılan" : "Adet"} aria-label="Toplu adet" onChange={(event) => changeBulk({ quantity: event.target.value.replace(/\D/g, "") })} />
                    </span>
                    <select value={bulk.reason} aria-label="Toplu sebep" onChange={(event) => changeBulk({ reason: event.target.value })}>
                      {reasons.map((reason) => <option key={reason.value} value={reason.value}>{reason.label}</option>)}
                    </select>
                    <input className="inv-note" value={bulk.note} maxLength={160} placeholder={bulk.reason === "other" ? "Not (zorunlu)" : "Not (isteğe bağlı)"} aria-label="Toplu not" onChange={(event) => changeBulk({ note: event.target.value })} />
                    <button className="green-btn" type="button" disabled={bulkBusy} onClick={() => run(readBulk())}>Seçilenlere uygula</button>
                  </div>
                  <div className="inv-selbar-row">
                    <label className="inv-selbar-threshold">
                      Kritik eşiği ayarla:
                      <input
                        className="inv-threshold"
                        inputMode="numeric"
                        value={bulkThreshold}
                        placeholder="N"
                        onChange={(event) => {
                          setBulkThreshold(event.target.value.replace(/\D/g, ""));
                          setBulkSummary(null);
                          setBulkNotice(null);
                        }}
                      />
                    </label>
                    <button className="text-btn" type="button" disabled={bulkBusy} onClick={() => run(readBulkThreshold())}>Eşiği uygula</button>
                    <button className="text-btn inv-selbar-clear" type="button" onClick={clearSelection}>Seçimi temizle</button>
                  </div>
                </>
              )}
              {bulkNotice ? <p className={`settings-message is-${bulkNotice.kind}`} role={bulkNotice.kind === "error" ? "alert" : "status"}>{bulkNotice.text}</p> : null}
              {bulkSummary ? (
                <div className="inv-selbar-summary">
                  <p><strong>{summaryText(bulkSummary.operation, bulkSummary.data)}</strong></p>
                  {bulkSummary.data.skippedRows.length ? (
                    <ul>
                      {bulkSummary.data.skippedRows.map((row) => <li key={row.id}>{row.label} · mevcut {row.onHand}</li>)}
                      {bulkSummary.data.skipped > bulkSummary.data.skippedRows.length ? <li>ve {bulkSummary.data.skipped - bulkSummary.data.skippedRows.length} ürün daha</li> : null}
                    </ul>
                  ) : null}
                  <div className="inv-bulk-actions">
                    <button className="green-btn" type="button" disabled={bulkBusy || !bulkSummary.data.applicable} onClick={confirmAll}>
                      {bulkBusy ? "Uygulanıyor…" : "Onayla ve uygula"}
                    </button>
                    <button className="text-btn" type="button" disabled={bulkBusy} onClick={() => setBulkSummary(null)}>Vazgeç</button>
                  </div>
                </div>
              ) : null}
            </section>
          ) : null}

          {rows.length === 0 ? <p className="tax-empty">{loading ? "Yükleniyor…" : filtered ? "Filtreye uyan kayıt yok." : "Kayıt yok."}</p> : (
            <table className={`inv-table inv-stock-table${loading ? " is-loading" : ""}`}>
              <thead>
                <tr>
                  {canEdit ? (
                    <th className="inv-check">
                      <input
                        type="checkbox"
                        aria-label="Sayfadakilerin hepsini seç"
                        checked={pageAll}
                        ref={(element) => {
                          if (element) element.indeterminate = !pageAll && selected.length > 0;
                        }}
                        onChange={togglePage}
                      />
                    </th>
                  ) : null}
                  <th>Ürün / varyant</th>
                  <th>Mevcut</th>
                  <th>Kritik</th>
                  {canEdit ? <th>İşlem</th> : null}
                  {canEdit ? <th>Adet ve sebep</th> : null}
                </tr>
              </thead>
              <tbody>
                {rows.map((item) => {
                  const entry = entries[item.variantId] ?? EMPTY_ENTRY;
                  const parsed = readEntry(entry, item.onHand);
                  const rowClass = [
                    item.state !== "ok" ? `is-${item.state}` : "",
                    conflicts[item.variantId] ? "is-conflict" : errors[item.variantId] ? "is-invalid" : entry.action ? "is-dirty" : "",
                  ].filter(Boolean).join(" ");
                  return (
                    <tr key={item.variantId} className={rowClass || undefined}>
                      {canEdit ? (
                        <td className="inv-check">
                          <input type="checkbox" aria-label={`${item.productName} ${item.name} seç`} checked={isSelected(item.variantId)} onChange={() => toggleRow(item.variantId)} />
                        </td>
                      ) : null}
                      <td className="inv-name">
                        <div className="inv-name-in">
                          <Thumb src={item.imageUrl} />
                          <span className="inv-name-text">
                            <span className="inv-name-title">
                              <Link href={`/admin/urunler/${item.productId}`}>{item.productName}</Link>
                              <StateBadge state={item.state} />
                            </span>
                            <small>{item.name} · {item.sku}</small>
                            {conflicts[item.variantId] ? <em className="inv-conflict" role="alert">{conflicts[item.variantId]}</em> : null}
                            {errors[item.variantId] ? <em className="field-error" role="alert">{errors[item.variantId]}</em> : null}
                          </span>
                        </div>
                      </td>
                      <td data-label="Mevcut" className="inv-num">
                        <strong>{item.onHand}</strong>
                        {parsed && !("error" in parsed) ? <small className="inv-after">→ {parsed.after}</small> : null}
                      </td>
                      <td data-label="Kritik">
                        {canEdit ? (
                          <input
                            className={`inv-threshold${thresholds[item.variantId] !== undefined && Number(thresholds[item.variantId]) !== item.lowThreshold ? " is-changed" : ""}`}
                            inputMode="numeric"
                            value={thresholds[item.variantId] ?? String(item.lowThreshold)}
                            aria-label={`${item.productName} ${item.name} kritik eşik`}
                            onChange={(event) => {
                              setThresholds((current) => ({ ...current, [item.variantId]: event.target.value.replace(/\D/g, "") }));
                              clearRowMarks(item.variantId);
                              setMessage(null);
                            }}
                          />
                        ) : item.lowThreshold}
                      </td>
                      {canEdit ? (
                        <td data-label="İşlem">
                          <select value={entry.action} aria-label={`${item.productName} ${item.name} işlem`} onChange={(event) => setEntry(item, { action: event.target.value as Action })}>
                            {ACTIONS.map((action) => <option key={action.value || "none"} value={action.value}>{action.label}</option>)}
                          </select>
                        </td>
                      ) : null}
                      {canEdit ? (
                        <td data-label="Adet ve sebep">
                          {entry.action ? (
                            <div className="inv-entry">
                              <span className="inv-qty">
                                <span aria-hidden="true">{entry.action === "in" ? "+" : entry.action === "out" ? "−" : "="}</span>
                                <input
                                  inputMode="numeric"
                                  value={entry.quantity}
                                  placeholder={entry.action === "count" ? "Sayılan" : "Adet"}
                                  aria-label="Adet"
                                  onChange={(event) => setEntry(item, { quantity: event.target.value.replace(/\D/g, "") })}
                                />
                              </span>
                              <select value={entry.reason} aria-label="Sebep" onChange={(event) => setEntry(item, { reason: event.target.value })}>
                                {reasons.map((reason) => <option key={reason.value} value={reason.value}>{reason.label}</option>)}
                              </select>
                              <input
                                className="inv-note"
                                value={entry.note}
                                maxLength={160}
                                placeholder={entry.reason === "other" ? "Not (zorunlu)" : "Not (isteğe bağlı)"}
                                aria-label="Not"
                                onChange={(event) => setEntry(item, { note: event.target.value })}
                              />
                            </div>
                          ) : <span className="inv-muted">—</span>}
                        </td>
                      ) : null}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
          <nav className="inv-pager" aria-label="Sayfalama">
            {page > 1 ? <button className="text-btn" type="button" disabled={loading} onClick={() => goToPage(page - 1)}>‹ Önceki</button> : <span />}
            <span>{page} / {pages} · {total} kayıt</span>
            {page < pages ? <button className="text-btn" type="button" disabled={loading} onClick={() => goToPage(page + 1)}>Sonraki ›</button> : <span />}
          </nav>
        </section>
      ) : (
        <section className="panel-admin inv-card">
          <form
            className="inv-filters inv-movement-filters"
            onSubmit={(event) => {
              event.preventDefault();
              loadMovements(1);
            }}
          >
            <label className="field">Ürün<input value={filters.q} placeholder="Ürün, varyant veya SKU" onChange={(event) => setFilters({ ...filters, q: event.target.value })} /></label>
            <label className="field">Sebep
              <select value={filters.reason} onChange={(event) => setFilters({ ...filters, reason: event.target.value })}>
                <option value="">Tümü</option>
                {reasonOptions.map((reason) => <option key={reason.value} value={reason.value}>{reason.label}</option>)}
              </select>
            </label>
            <label className="field">Başlangıç<input type="date" value={filters.from} onChange={(event) => setFilters({ ...filters, from: event.target.value })} /></label>
            <label className="field">Bitiş<input type="date" value={filters.to} onChange={(event) => setFilters({ ...filters, to: event.target.value })} /></label>
            <button className="green-btn" type="submit" disabled={loadingMovements}>Filtrele</button>
          </form>
          {movementError ? <p className="settings-message is-error" role="alert">{movementError}</p> : null}
          {!movements ? <p className="tax-empty">{loadingMovements ? "Yükleniyor…" : ""}</p> : movements.rows.length === 0 ? <p className="tax-empty">Hareket yok.</p> : (
            <table className="inv-table inv-moves">
              <thead>
                <tr>
                  <th>Tarih</th>
                  <th>Ürün / varyant</th>
                  <th>Değişim</th>
                  <th>Sonrası</th>
                  <th>Sebep</th>
                  <th>Kim</th>
                </tr>
              </thead>
              <tbody>
                {movements.rows.map((row) => (
                  <tr key={row.id}>
                    <td data-label="Tarih">{formatWhenShort(row.createdAt)}</td>
                    <td className="inv-name">
                      <div className="inv-name-in">
                        <span className="inv-name-text">
                          <Link href={`/admin/urunler/${row.productId}`}>{row.productName}</Link>
                          <small>{row.variantName} · {row.sku}</small>
                        </span>
                      </div>
                    </td>
                    <td data-label="Değişim" className="inv-num">
                      {row.delta == null ? <span className="inv-muted" title="Eski sayım kaydı; fark kaydedilmemiş.">± {row.quantity}</span> : (
                        <strong className={row.delta > 0 ? "is-plus" : row.delta < 0 ? "is-minus" : undefined}>{signed(row.delta)}</strong>
                      )}
                    </td>
                    <td data-label="Sonrası" className="inv-num">{row.balanceAfter ?? "—"}</td>
                    <td data-label="Sebep">{row.reason}</td>
                    <td data-label="Kim">
                      {row.order ? <Link href={`/admin/siparisler/${row.order.id}`}>{row.order.number ? `Sipariş ${row.order.number}` : "Sipariş"}</Link> : row.by}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {movements ? (
            <nav className="inv-pager" aria-label="Sayfalama">
              {movements.page > 1 ? <button className="text-btn" type="button" disabled={loadingMovements} onClick={() => loadMovements(movements.page - 1, movements.filters)}>‹ Önceki</button> : <span />}
              <span>{movements.page} / {movementPages} · {movements.total} hareket</span>
              {movements.page < movementPages ? <button className="text-btn" type="button" disabled={loadingMovements} onClick={() => loadMovements(movements.page + 1, movements.filters)}>Sonraki ›</button> : <span />}
            </nav>
          ) : null}
        </section>
      )}
    </div>
  );
}
