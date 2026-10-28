"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ApiError, browserApi } from "@/lib/api";
import { formatTry } from "@/lib/money";
import { PRODUCT_STATUS_LABEL } from "@/lib/products";
import { moneyText, parseMoney } from "@/lib/settings-form";
import { errorMap, Thumb } from "../taxonomy/shared";

export type AdminVariantRow = {
  id: string;
  productId: string;
  productName: string;
  productStatus: string;
  name: string;
  sku: string;
  barcode: string | null;
  priceAmount: number;
  compareAtAmount: number | null;
  onHand: number;
  stock: "out" | "low" | "ok";
  disabled: boolean;
  imageUrl: string | null;
};

type PriceDraft = { price: string; compareAt: string };
type BulkRule = { mode: "percent" | "amount"; direction: "increase" | "decrease"; value: string; includeCompareAt: boolean };
type PreviewRow = {
  id: string;
  productName: string;
  name: string;
  sku: string;
  before: { priceAmount: number; compareAtAmount: number | null };
  after: { priceAmount: number; compareAtAmount: number | null };
  problem: string | null;
};

type PriceChange = { id: string; priceAmount: number; compareAtAmount: number | null };

function readDraft(draft: PriceDraft): { error: string } | Omit<PriceChange, "id"> {
  const price = parseMoney(draft.price);
  const compareAt = draft.compareAt.trim() ? parseMoney(draft.compareAt) : null;
  if (price === null) return { error: "Geçerli bir satış fiyatı yazın." };
  if (price <= 0) return { error: "Satış fiyatı sıfırdan büyük olmalı." };
  if (draft.compareAt.trim() && compareAt === null) return { error: "Geçerli bir indirim öncesi fiyat yazın." };
  if (compareAt !== null && compareAt <= price) return { error: "İndirim öncesi fiyat, satış fiyatından yüksek olmalı." };
  return { priceAmount: price, compareAtAmount: compareAt };
}

function ruleValue(rule: BulkRule) {
  if (rule.mode === "amount") return parseMoney(rule.value);
  const value = Number(rule.value.replace(",", "."));
  return rule.value.trim() && Number.isFinite(value) ? value : null;
}

function ruleText(rule: BulkRule, value: number, count: number) {
  const amount = rule.mode === "percent" ? `%${String(value).replace(".", ",")}` : formatTry(value);
  return `${count} varyantın fiyatı ${amount} ${rule.direction === "increase" ? "artırılacak" : "azaltılacak"}${rule.includeCompareAt ? " (indirim öncesi fiyat dahil)" : ""}`;
}

function StockText({ row }: { row: AdminVariantRow }) {
  return (
    <span className={`inv-stock is-${row.stock}`}>
      {row.onHand}
      {row.stock === "out" ? " · tükendi" : row.stock === "low" ? " · kritik" : ""}
    </span>
  );
}

export type Pager = { page: number; pages: number; total: number; prevHref: string | null; nextHref: string | null };

export function PagerLinks({ pager, unit, guard }: { pager: Pager; unit: string; guard?: () => boolean }) {
  const onClick = (event: React.MouseEvent) => {
    if (guard && !guard()) event.preventDefault();
  };
  return (
    <nav className="inv-pager" aria-label="Sayfalama">
      {pager.prevHref ? <Link className="text-btn" href={pager.prevHref} onClick={onClick}>‹ Önceki</Link> : <span />}
      <span>{pager.page} / {pager.pages} · {pager.total} {unit}</span>
      {pager.nextHref ? <Link className="text-btn" href={pager.nextHref} onClick={onClick}>Sonraki ›</Link> : <span />}
    </nav>
  );
}

export type VariantFilter = { q?: string; category?: string; status?: string };

export function BulkPriceManager({ rows, canEdit, pager, filter }: { rows: AdminVariantRow[]; canEdit: boolean; pager: Pager; filter: VariantFilter }) {
  const router = useRouter();
  const [drafts, setDrafts] = useState<Record<string, PriceDraft>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [allMatching, setAllMatching] = useState(false);
  const [rule, setRule] = useState<BulkRule>({ mode: "percent", direction: "increase", value: "", includeCompareAt: true });
  const [preview, setPreview] = useState<{ key: string; rows: PreviewRow[]; problems: number; total: number; fingerprint: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const byId = useMemo(() => new Map(rows.map((row) => [row.id, row])), [rows]);
  const { changes, invalid } = useMemo(() => {
    const valid: PriceChange[] = [];
    const broken: Record<string, string> = {};
    for (const [id, draft] of Object.entries(drafts)) {
      const row = byId.get(id);
      if (!row) continue;
      const parsed = readDraft(draft);
      if ("error" in parsed) broken[id] = parsed.error;
      else if (parsed.priceAmount !== row.priceAmount || parsed.compareAtAmount !== row.compareAtAmount) valid.push({ id, ...parsed });
    }
    return { changes: valid, invalid: broken };
  }, [drafts, byId]);
  const editCount = changes.length + Object.keys(invalid).length;
  const dirty = editCount > 0;

  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const previewKey = JSON.stringify([allMatching || selected, rule]);
  const selectionCount = allMatching ? pager.total : selected.length;
  const shownPreview = preview && preview.key === previewKey ? preview : null;

  function draftOf(row: AdminVariantRow): PriceDraft {
    return drafts[row.id] ?? { price: moneyText(row.priceAmount), compareAt: moneyText(row.compareAtAmount) };
  }

  function edit(row: AdminVariantRow, patch: Partial<PriceDraft>) {
    setDrafts((current) => ({ ...current, [row.id]: { ...draftOf(row), ...patch } }));
    setErrors((current) => {
      if (!current[row.id]) return current;
      const next = { ...current };
      delete next[row.id];
      return next;
    });
    setMessage(null);
  }

  function isChanged(row: AdminVariantRow, field: "price" | "compareAt") {
    const draft = drafts[row.id];
    if (!draft) return false;
    if (field === "price") return parseMoney(draft.price) !== row.priceAmount;
    return (draft.compareAt.trim() ? parseMoney(draft.compareAt) : null) !== row.compareAtAmount;
  }

  async function save() {
    if (Object.keys(invalid).length) {
      setErrors(invalid);
      setMessage({ kind: "error", text: "Kırmızı işaretli satırları düzeltin." });
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      const body = await browserApi<{ data: { changed: number } }>("/admin/variants/prices", {
        method: "PUT",
        body: JSON.stringify({ items: changes }),
      });
      setDrafts({});
      setErrors({});
      setMessage({ kind: "ok", text: `${body.data.changed} varyantın fiyatı kaydedildi.` });
      router.refresh();
    } catch (error) {
      if (error instanceof ApiError) {
        setErrors(errorMap(error.details));
        setMessage({ kind: "error", text: error.message });
      } else setMessage({ kind: "error", text: "Kaydedilemedi." });
    } finally {
      setSaving(false);
    }
  }

  function discard() {
    setDrafts({});
    setErrors({});
    setMessage(null);
  }

  const isSelected = (id: string) => allMatching || selected.includes(id);
  const allSelected = rows.length > 0 && rows.every((row) => isSelected(row.id));

  function toggle(id: string) {
    if (allMatching) {
      setAllMatching(false);
      setSelected(rows.map((row) => row.id).filter((item) => item !== id));
      return;
    }
    setSelected((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  }

  function clearSelection() {
    setSelected([]);
    setAllMatching(false);
    setPreview(null);
  }

  async function runBulk(apply: boolean) {
    const value = ruleValue(rule);
    if (value === null || value <= 0) {
      setMessage({ kind: "error", text: rule.mode === "percent" ? "Yüzde değerini yazın." : "Tutarı TL olarak yazın." });
      return;
    }
    if (apply && !window.confirm(`${shownPreview?.total ?? selectionCount} varyantın fiyatı güncellenecek. Onaylıyor musunuz?`)) return;
    setBusy(true);
    setMessage(null);
    const scope = allMatching ? { filter } : { ids: selected };
    try {
      const body = await browserApi<{ data: PreviewRow[]; meta: { problems: number; total: number; fingerprint: string; applied?: number } }>("/admin/variants/bulk-price", {
        method: "POST",
        body: JSON.stringify({
          ...scope,
          mode: rule.mode,
          direction: rule.direction,
          value,
          includeCompareAt: rule.includeCompareAt,
          apply,
          ...(apply && allMatching ? { fingerprint: preview?.fingerprint } : {}),
        }),
      });
      if (apply) {
        clearSelection();
        setMessage({ kind: "ok", text: `${body.meta.applied ?? body.data.length} varyantın fiyatı güncellendi.` });
        router.refresh();
      } else setPreview({ key: previewKey, rows: body.data, problems: body.meta.problems, total: body.meta.total, fingerprint: body.meta.fingerprint });
    } catch (error) {
      if (apply && error instanceof ApiError && error.code === "PRICE_CHANGED") {
        setBusy(false);
        await runBulk(false);
        setMessage({ kind: "error", text: error.message });
        router.refresh();
        return;
      }
      setMessage({ kind: "error", text: error instanceof ApiError ? error.message : "İşlem yapılamadı." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {canEdit ? (
        <div className="inv-savebar">
          {message ? <p className={`settings-message is-${message.kind}`} role={message.kind === "error" ? "alert" : "status"}>{message.text}</p> : null}
          {dirty ? <button className="text-btn" type="button" onClick={discard} disabled={saving}>Vazgeç</button> : null}
          <button className="green-btn inv-save" type="button" onClick={save} disabled={!dirty || saving}>
            {saving ? "Kaydediliyor…" : dirty ? `Kaydet (${editCount})` : "Kaydet"}
          </button>
        </div>
      ) : null}

      {canEdit && selectionCount ? (
        <section className="inv-bulk inv-floating" aria-label="Toplu fiyat güncelleme">
          <div className="inv-selbar-head">
            <h2>Toplu fiyat · {allMatching ? `filtreye uyan ${pager.total} varyantın tümü seçildi` : `${selected.length} varyant seçili`}</h2>
            {!allMatching && allSelected && pager.total > rows.length ? (
              <button className="text-btn" type="button" onClick={() => { setAllMatching(true); setPreview(null); }}>Filtreye uyan {pager.total} varyantın tümünü seç</button>
            ) : null}
            <button className="text-btn" type="button" onClick={clearSelection}>Seçimi temizle</button>
          </div>
          {dirty ? <p className="settings-note">Önce tablodaki fiyat değişikliklerini kaydedin veya vazgeçin.</p> : (
            <>
              <div className="inv-bulk-row">
                <select value={rule.direction} onChange={(event) => setRule({ ...rule, direction: event.target.value as BulkRule["direction"] })} aria-label="Yön">
                  <option value="increase">Artır</option>
                  <option value="decrease">Azalt</option>
                </select>
                <select value={rule.mode} onChange={(event) => setRule({ ...rule, mode: event.target.value as BulkRule["mode"], value: "" })} aria-label="Tür">
                  <option value="percent">Yüzde (%)</option>
                  <option value="amount">Tutar (TL)</option>
                </select>
                <input
                  inputMode="decimal"
                  value={rule.value}
                  placeholder={rule.mode === "percent" ? "Örn. 10" : "Örn. 25,00"}
                  onChange={(event) => setRule({ ...rule, value: event.target.value })}
                  aria-label={rule.mode === "percent" ? "Yüzde" : "Tutar"}
                />
                <label className="menu-check">
                  <input type="checkbox" checked={rule.includeCompareAt} onChange={(event) => setRule({ ...rule, includeCompareAt: event.target.checked })} />
                  İndirim öncesi fiyata da uygula
                </label>
                <button className="text-btn" type="button" onClick={() => runBulk(false)} disabled={busy}>Önizle</button>
              </div>
              {shownPreview ? (
                <div className="tax-preview inv-preview">
                  <h4>Önizleme {shownPreview.problems ? `· ${shownPreview.problems} satırda kural ihlali var` : "· sorun yok"}</h4>
                  {allMatching ? (
                    <p className="inv-preview-summary">
                      <strong>{ruleText(rule, ruleValue(rule) ?? 0, shownPreview.total)}.</strong>
                      {shownPreview.problems ? ` ${shownPreview.problems} varyant kurala uymadığı için hiçbiri uygulanmaz; filtreyi daraltın veya değeri değiştirin.` : ""}
                      {shownPreview.total > shownPreview.rows.length ? ` İlk ${shownPreview.rows.length} satır gösteriliyor.` : ""}
                    </p>
                  ) : null}
                  <ul>
                    {shownPreview.rows.map((row) => (
                      <li key={row.id} className={row.problem ? "is-problem" : undefined}>
                        <span>{row.productName} · {row.name}</span>
                        <small>
                          {formatTry(row.before.priceAmount)} → <strong>{formatTry(row.after.priceAmount)}</strong>
                          {row.after.compareAtAmount != null ? ` · indirim öncesi ${formatTry(row.after.compareAtAmount)}` : ""}
                        </small>
                        {row.problem ? <em>{row.problem}</em> : null}
                      </li>
                    ))}
                  </ul>
                  <div className="inv-bulk-actions">
                    <button className="green-btn" type="button" onClick={() => runBulk(true)} disabled={busy || shownPreview.problems > 0}>Onayla ve uygula</button>
                    <button className="text-btn" type="button" onClick={() => setPreview(null)} disabled={busy}>Kapat</button>
                  </div>
                </div>
              ) : null}
            </>
          )}
        </section>
      ) : null}

      <section className="panel-admin inv-card">
        {rows.length === 0 ? <p className="tax-empty">Kayıt yok.</p> : (
          <table className="inv-table">
            <thead>
              <tr>
                {canEdit ? (
                  <th className="inv-check">
                    <input
                      type="checkbox"
                      aria-label="Sayfadakilerin hepsini seç"
                      checked={allSelected}
                      onChange={() => {
                        if (allSelected) clearSelection();
                        else setSelected(rows.map((row) => row.id));
                      }}
                    />
                  </th>
                ) : null}
                <th>Ürün / varyant</th>
                <th>SKU</th>
                <th>Barkod</th>
                <th>Satış fiyatı</th>
                <th>İndirim öncesi</th>
                <th>Stok</th>
                <th>Durum</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const draft = draftOf(row);
                return (
                  <tr key={row.id} className={errors[row.id] ? "is-invalid" : invalid[row.id] || changes.some((item) => item.id === row.id) ? "is-dirty" : undefined}>
                    {canEdit ? (
                      <td className="inv-check">
                        <input type="checkbox" aria-label={`${row.productName} ${row.name} seç`} checked={isSelected(row.id)} onChange={() => toggle(row.id)} />
                      </td>
                    ) : null}
                    <td className="inv-name">
                      <div className="inv-name-in">
                        <Thumb src={row.imageUrl} />
                        <span className="inv-name-text">
                          <small>{row.productName}</small>
                          <Link href={`/admin/urunler/${row.productId}`}>{row.name}</Link>
                          {errors[row.id] ? <em className="field-error" role="alert">{errors[row.id]}</em> : null}
                        </span>
                      </div>
                    </td>
                    <td data-label="SKU">{row.sku}</td>
                    <td data-label="Barkod">{row.barcode || "—"}</td>
                    <td data-label="Satış fiyatı">
                      {canEdit ? (
                        <span className={`inv-money${isChanged(row, "price") ? " is-changed" : ""}`}>
                          <input inputMode="decimal" value={draft.price} aria-label={`${row.name} satış fiyatı`} onChange={(event) => edit(row, { price: event.target.value })} />
                          <span>TL</span>
                        </span>
                      ) : formatTry(row.priceAmount)}
                    </td>
                    <td data-label="İndirim öncesi">
                      {canEdit ? (
                        <span className={`inv-money${isChanged(row, "compareAt") ? " is-changed" : ""}`}>
                          <input inputMode="decimal" value={draft.compareAt} placeholder="—" aria-label={`${row.name} indirim öncesi fiyat`} onChange={(event) => edit(row, { compareAt: event.target.value })} />
                          <span>TL</span>
                        </span>
                      ) : row.compareAtAmount != null ? formatTry(row.compareAtAmount) : "—"}
                    </td>
                    <td data-label="Stok"><StockText row={row} /></td>
                    <td data-label="Durum">
                      {PRODUCT_STATUS_LABEL[row.productStatus] ?? row.productStatus}
                      {row.disabled ? <span className="inv-badge is-muted">Varyant kapalı</span> : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
        {!canEdit ? <p className="settings-note inv-readonly">Fiyatları yalnızca Owner ve Admin değiştirebilir.</p> : null}
        <PagerLinks pager={pager} unit="varyant" guard={() => !dirty || window.confirm("Kaydedilmemiş fiyat değişiklikleri kaybolacak. Devam edilsin mi?")} />
      </section>
    </>
  );
}
