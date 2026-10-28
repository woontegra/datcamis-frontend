"use client";

import { useState } from "react";
import { ApiError, browserApi } from "@/lib/api";
import { DragHandle, errorMap, Field } from "../taxonomy/shared";

export type AttributeDisplay = "BUTTONS" | "SELECT" | "SWATCH";
export type AdminAttribute = {
  id: string;
  name: string;
  displayType: AttributeDisplay;
  productCount: number;
  values: Array<{ id: string; name: string; colorHex: string | null; productCount: number }>;
};

type ValueDraft = { key: string; id?: string; name: string; colorHex: string; productCount: number };
type Draft = { id?: string; name: string; displayType: AttributeDisplay; values: ValueDraft[] };

export const DISPLAY_LABELS: Record<AttributeDisplay, string> = { BUTTONS: "Düğmeler", SELECT: "Açılır liste", SWATCH: "Renk kutuları" };
const DEFAULT_COLOR = "#cccccc";

let keySeed = 0;
const nextKey = () => `new-${(keySeed += 1)}`;

function toDraft(attribute: AdminAttribute): Draft {
  return {
    id: attribute.id,
    name: attribute.name,
    displayType: attribute.displayType,
    values: attribute.values.map((value) => ({ key: value.id, id: value.id, name: value.name, colorHex: value.colorHex ?? "", productCount: value.productCount })),
  };
}

const signature = (draft: Draft) =>
  JSON.stringify([draft.name.trim(), draft.displayType, draft.values.map((value) => [value.id ?? "", value.name.trim(), value.colorHex])]);

export function OptionPreview({ displayType, values }: { displayType: AttributeDisplay; values: Array<{ name: string; colorHex?: string | null; muted?: boolean }> }) {
  const [active, setActive] = useState(0);
  const shown = values.filter((value) => value.name.trim());
  if (!shown.length) return <p className="settings-note">Değer ekleyince burada görünür.</p>;
  if (displayType === "SELECT") {
    return (
      <select className="attr-preview-select" value={active} onChange={(event) => setActive(Number(event.target.value))} aria-label="Önizleme">
        {shown.map((value, index) => <option key={index} value={index} disabled={value.muted}>{value.name}{value.muted ? " (yok)" : ""}</option>)}
      </select>
    );
  }
  return (
    <div className="attr-preview" role="group" aria-label="Önizleme">
      {shown.map((value, index) =>
        displayType === "SWATCH" ? (
          <button
            key={index}
            type="button"
            className={`attr-swatch${index === active ? " is-active" : ""}${value.muted ? " is-muted" : ""}`}
            style={{ background: value.colorHex || DEFAULT_COLOR }}
            title={value.name}
            aria-label={value.name}
            onClick={() => !value.muted && setActive(index)}
          />
        ) : (
          <button key={index} type="button" className={`attr-pill${index === active ? " is-active" : ""}${value.muted ? " is-muted" : ""}`} onClick={() => !value.muted && setActive(index)}>
            {value.name}
          </button>
        ),
      )}
    </div>
  );
}

export function AttributeManager({ initial, canEdit }: { initial: AdminAttribute[]; canEdit: boolean }) {
  const [attributes, setAttributes] = useState(initial);
  const [selectedId, setSelectedId] = useState<string | null>(initial[0]?.id ?? null);
  const [draft, setDraft] = useState<Draft | null>(initial[0] ? toDraft(initial[0]) : null);
  const [baseline, setBaseline] = useState(() => (initial[0] ? signature(toDraft(initial[0])) : ""));
  const [newValue, setNewValue] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [dragKey, setDragKey] = useState<string | null>(null);

  const dirty = draft ? signature(draft) !== baseline : false;
  const selected = attributes.find((item) => item.id === selectedId) ?? null;

  function load(next: Draft | null, id: string | null) {
    setSelectedId(id);
    setDraft(next);
    setBaseline(next ? signature(next) : "");
    setNewValue("");
    setErrors({});
  }

  function select(attribute: AdminAttribute) {
    if (attribute.id === selectedId) return;
    if (dirty && !window.confirm("Kaydedilmemiş değişiklikler kaybolacak. Devam edilsin mi?")) return;
    setMessage(null);
    load(toDraft(attribute), attribute.id);
  }

  function startNew() {
    if (dirty && !window.confirm("Kaydedilmemiş değişiklikler kaybolacak. Devam edilsin mi?")) return;
    setMessage(null);
    const fresh: Draft = { name: "", displayType: "BUTTONS", values: [] };
    setSelectedId(null);
    setDraft(fresh);
    setBaseline(signature(fresh));
    setNewValue("");
    setErrors({});
  }

  function patch(next: Partial<Draft>) {
    setDraft((current) => (current ? { ...current, ...next } : current));
    setMessage(null);
  }

  function patchValue(key: string, next: Partial<ValueDraft>) {
    setDraft((current) => (current ? { ...current, values: current.values.map((value) => (value.key === key ? { ...value, ...next } : value)) } : current));
    setMessage(null);
  }

  function addValue() {
    const name = newValue.trim();
    if (!draft || !name) return;
    if (draft.values.some((value) => value.name.trim().toLocaleLowerCase("tr") === name.toLocaleLowerCase("tr"))) {
      setErrors({ newValue: `“${name}” zaten var.` });
      return;
    }
    patch({ values: [...draft.values, { key: nextKey(), name, colorHex: draft.displayType === "SWATCH" ? DEFAULT_COLOR : "", productCount: 0 }] });
    setNewValue("");
    setErrors({});
  }

  function removeValue(value: ValueDraft) {
    if (!draft) return;
    if (value.productCount > 0) {
      setMessage({ kind: "error", text: `“${value.name}” ${value.productCount} üründe kullanılıyor; silmeden önce o ürünlerden kaldırın.` });
      return;
    }
    if (value.id && !window.confirm(`“${value.name}” değeri silinsin mi? Kaydettiğinizde silinir.`)) return;
    patch({ values: draft.values.filter((item) => item.key !== value.key) });
  }

  function move(key: string, to: number) {
    if (!draft) return;
    const from = draft.values.findIndex((value) => value.key === key);
    if (from < 0 || to < 0 || to >= draft.values.length || from === to) return;
    const values = [...draft.values];
    const [item] = values.splice(from, 1);
    values.splice(to, 0, item);
    patch({ values });
  }

  async function save() {
    if (!draft) return;
    setSaving(true);
    setMessage(null);
    setErrors({});
    const payload = {
      name: draft.name.trim(),
      displayType: draft.displayType,
      values: draft.values.map((value) => ({
        ...(value.id ? { id: value.id } : {}),
        name: value.name.trim(),
        colorHex: draft.displayType === "SWATCH" || value.colorHex ? value.colorHex || null : null,
      })),
    };
    try {
      const body = await browserApi<{ data: AdminAttribute }>(draft.id ? `/admin/attributes/${draft.id}` : "/admin/attributes", {
        method: draft.id ? "PUT" : "POST",
        body: JSON.stringify(payload),
      });
      const saved = body.data;
      setAttributes((current) =>
        draft.id ? current.map((item) => (item.id === saved.id ? saved : item)) : [...current, saved].sort((a, b) => a.name.localeCompare(b.name, "tr")),
      );
      load(toDraft(saved), saved.id);
      setMessage({ kind: "ok", text: "Kaydedildi." });
    } catch (error) {
      if (error instanceof ApiError) {
        const byKey: Record<string, string> = {};
        for (const [path, text] of Object.entries(errorMap(error.details))) {
          const index = /^values\.(\d+)/.exec(path)?.[1];
          byKey[index !== undefined ? draft.values[Number(index)]?.key ?? path : path] = text;
        }
        setErrors(byKey);
        setMessage({ kind: "error", text: error.message });
      } else setMessage({ kind: "error", text: "Kaydedilemedi." });
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!draft?.id || !selected) return;
    if (selected.productCount > 0) {
      setMessage({ kind: "error", text: `“${selected.name}” ${selected.productCount} üründe kullanılıyor; silmeden önce o ürünlerden kaldırın.` });
      return;
    }
    if (!window.confirm(`“${selected.name}” özelliği ve tüm değerleri silinsin mi?`)) return;
    setSaving(true);
    try {
      await browserApi(`/admin/attributes/${draft.id}`, { method: "DELETE" });
      const rest = attributes.filter((item) => item.id !== draft.id);
      setAttributes(rest);
      load(rest[0] ? toDraft(rest[0]) : null, rest[0]?.id ?? null);
      setMessage({ kind: "ok", text: "Silindi." });
    } catch (error) {
      setMessage({ kind: "error", text: error instanceof ApiError ? error.message : "Silinemedi." });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="tax-page attr-page">
      <div className="admin-top">
        <h1>Varyant seçenekleri</h1>
        {canEdit ? <button className="green-btn tax-new" type="button" onClick={startNew}>+ Yeni özellik</button> : null}
      </div>
      {message && !draft ? <p className={`settings-message is-${message.kind}`} role={message.kind === "error" ? "alert" : "status"}>{message.text}</p> : null}
      <div className="tax-layout">
        <nav className="tax-tree attr-list" aria-label="Özellikler">
          {attributes.length === 0 ? <p className="tax-empty">Henüz özellik yok.</p> : (
            <ul>
              {attributes.map((attribute) => (
                <li key={attribute.id}>
                  <div className={`tax-row${attribute.id === selectedId ? " is-selected" : ""}`}>
                    <button className="tax-row-main" type="button" onClick={() => select(attribute)}>
                      <span className="tax-row-name">{attribute.name}</span>
                      <span className="tax-row-count">{attribute.values.length} değer · {attribute.productCount} ürün</span>
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </nav>

        {draft ? (
          <section className="tax-panel attr-panel" aria-label="Özellik düzenleme">
            <div className="tax-panel-head">
              <h2>{draft.id ? selected?.name ?? draft.name : draft.name.trim() || "Yeni özellik"}</h2>
              {canEdit && draft.id ? <button className="tax-delete" type="button" onClick={remove} disabled={saving}>Sil</button> : null}
              {canEdit ? (
                <button className="green-btn attr-save" type="button" onClick={save} disabled={saving || !dirty}>{saving ? "Kaydediliyor…" : "Kaydet"}</button>
              ) : null}
            </div>
            {message ? <p className={`settings-message is-${message.kind}`} role={message.kind === "error" ? "alert" : "status"}>{message.text}</p> : null}

            <fieldset className="tax-fields" disabled={!canEdit}>
              <div className="settings-row cols-2">
                <Field label="Özellik adı" error={errors.name}>
                  <input value={draft.name} maxLength={60} placeholder="Örn. Hacim, Metal, Renk" onChange={(event) => patch({ name: event.target.value })} />
                </Field>
                <Field label="Mağazada gösterim">
                  <select value={draft.displayType} onChange={(event) => patch({ displayType: event.target.value as AttributeDisplay })}>
                    {(Object.keys(DISPLAY_LABELS) as AttributeDisplay[]).map((key) => <option key={key} value={key}>{DISPLAY_LABELS[key]}</option>)}
                  </select>
                </Field>
              </div>

              <div className="attr-values">
                <h3>Değerler</h3>
                {draft.values.length === 0 ? <p className="settings-note">Henüz değer yok. Aşağıdan ekleyin.</p> : null}
                <ul className="attr-value-list">
                  {draft.values.map((value, index) => (
                    <li
                      key={value.key}
                      className={`attr-value${dragKey === value.key ? " is-dragging" : ""}${errors[value.key] || (value.id && errors[value.id]) ? " is-invalid" : ""}`}
                      draggable={canEdit}
                      onDragStart={(event) => {
                        setDragKey(value.key);
                        event.dataTransfer.effectAllowed = "move";
                      }}
                      onDragEnd={() => setDragKey(null)}
                      onDragOver={(event) => {
                        if (!dragKey) return;
                        event.preventDefault();
                        if (dragKey !== value.key) move(dragKey, index);
                      }}
                    >
                      <DragHandle />
                      {draft.displayType === "SWATCH" ? (
                        <input
                          className="attr-color"
                          type="color"
                          value={/^#[0-9a-fA-F]{6}$/.test(value.colorHex) ? value.colorHex.toLowerCase() : DEFAULT_COLOR}
                          aria-label={`${value.name} renk kodu`}
                          onChange={(event) => patchValue(value.key, { colorHex: event.target.value })}
                        />
                      ) : null}
                      <input className="attr-value-name" value={value.name} maxLength={60} aria-label="Değer adı" onChange={(event) => patchValue(value.key, { name: event.target.value })} />
                      {draft.displayType === "SWATCH" ? (
                        <input
                          className="attr-hex"
                          value={value.colorHex}
                          maxLength={7}
                          placeholder="#RRGGBB"
                          aria-label={`${value.name} renk kodu (metin)`}
                          onChange={(event) => patchValue(value.key, { colorHex: event.target.value.trim() })}
                        />
                      ) : null}
                      <span className="attr-value-meta">
                        {value.productCount > 0 ? (
                          <span title="Bir üründe kullanılan değer silinemez.">{value.productCount} üründe</span>
                        ) : (
                          <>
                            {value.id ? "Kullanılmıyor" : "Yeni"}
                            {canEdit ? <> · <button type="button" className="attr-remove" onClick={() => removeValue(value)}>{value.id ? "Sil" : "Kaldır"}</button></> : null}
                          </>
                        )}
                      </span>
                      <span className="tax-nudge">
                        <button type="button" aria-label="Yukarı taşı" disabled={index === 0} onClick={() => move(value.key, index - 1)}>↑</button>
                        <button type="button" aria-label="Aşağı taşı" disabled={index === draft.values.length - 1} onClick={() => move(value.key, index + 1)}>↓</button>
                      </span>
                      {errors[value.key] || (value.id && errors[value.id]) ? <span className="field-error attr-value-error">{errors[value.key] || errors[value.id!]}</span> : null}
                    </li>
                  ))}
                </ul>
                {canEdit ? (
                  <div className="attr-add">
                    <input
                      value={newValue}
                      maxLength={60}
                      placeholder="Yeni değer, örn. 500 ml"
                      aria-label="Yeni değer"
                      onChange={(event) => setNewValue(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          addValue();
                        }
                      }}
                    />
                    <button className="text-btn" type="button" onClick={addValue} disabled={!newValue.trim()}>Ekle</button>
                  </div>
                ) : null}
                {errors.newValue ? <span className="field-error">{errors.newValue}</span> : null}
              </div>
            </fieldset>

            <div className="tax-section attr-preview-box">
              <p className="settings-note">Müşteri ürün sayfasında böyle görecek</p>
              <OptionPreview
                key={draft.displayType}
                displayType={draft.displayType}
                values={draft.values.map((value) => ({ name: value.name, colorHex: value.colorHex, muted: Boolean(value.id) && value.productCount === 0 }))}
              />
            </div>
            {!canEdit ? <p className="settings-note">Özellikleri yalnızca Owner, Admin ve Editor değiştirebilir.</p> : null}
          </section>
        ) : (
          <section className="tax-panel attr-panel">
            <p className="tax-empty">{canEdit ? "Soldan bir özellik seçin veya “+ Yeni özellik” ile başlayın." : "Soldan bir özellik seçin."}</p>
          </section>
        )}
      </div>
    </div>
  );
}
