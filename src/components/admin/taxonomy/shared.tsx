"use client";

import { useState } from "react";
import { ProductMediaPicker } from "../ProductMediaPicker";

export type Seo = { title: string | null; description: string | null };

export type SampleProduct = { id: string; name: string; status: string; priceAmount: number | null; imageUrl: string | null };

export function mediaUrl(id: string | null | undefined) {
  return id ? `/api/v1/media/${id}/file` : "";
}

const TR: Record<string, string> = { ç: "c", ğ: "g", ı: "i", İ: "i", ö: "o", ş: "s", ü: "u", Ç: "c", Ğ: "g", Ö: "o", Ş: "s", Ü: "u" };

export function suggestSlug(value: string) {
  return value
    .replace(/[çğıİöşüÇĞÖŞÜ]/g, (char) => TR[char] || char)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function Field({ label, error, hint, children }: { label: string; error?: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
      {hint && !error ? <small className="settings-hint">{hint}</small> : null}
      {error ? <span className="field-error" role="alert">{error}</span> : null}
    </label>
  );
}

export function Switch({ checked, onChange, label }: { checked: boolean; onChange: (value: boolean) => void; label: string }) {
  return (
    <label className="settings-switch">
      <input type="checkbox" role="switch" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      <span className="settings-switch-track" aria-hidden="true" />
      <span>{label}</span>
    </label>
  );
}

export function DragHandle() {
  return (
    <svg className="tax-handle" viewBox="0 0 12 18" width="10" height="16" aria-hidden="true">
      {[3, 9, 15].flatMap((y) => [<circle key={`a${y}`} cx="3" cy={y} r="1.4" />, <circle key={`b${y}`} cx="9" cy={y} r="1.4" />])}
    </svg>
  );
}

export function Thumb({ src }: { src: string | null | undefined }) {
  return src ? <img className="tax-thumb" src={src} alt="" /> : <span className="tax-thumb is-empty" aria-hidden="true" />;
}

export function ImageField({ value, onChange, disabled }: { value: string | null; onChange: (id: string | null) => void; disabled?: boolean }) {
  const [picking, setPicking] = useState(false);
  return (
    <div className="field settings-media">
      <span>Görsel</span>
      <div className="settings-media-row">
        {value ? <img src={mediaUrl(value)} alt="" /> : <span className="settings-media-empty" aria-hidden="true" />}
        {!disabled ? (
          <div className="tax-media-actions">
            <button className="text-btn" type="button" onClick={() => setPicking((open) => !open)}>{picking ? "Kapat" : "Görsel seç"}</button>
            {value ? <button className="text-btn" type="button" onClick={() => onChange(null)}>Kaldır</button> : null}
          </div>
        ) : null}
      </div>
      {picking ? <ProductMediaPicker usage="general" onPick={(item) => { onChange(item.id); setPicking(false); }} /> : null}
    </div>
  );
}

export function SeoFields({
  prefix,
  slug,
  title,
  description,
  namePlaceholder,
  errors,
  onSlug,
  onTitle,
  onDescription,
}: {
  prefix: string;
  slug: string;
  title: string;
  description: string;
  namePlaceholder: string;
  errors: Record<string, string>;
  onSlug: (value: string) => void;
  onTitle: (value: string) => void;
  onDescription: (value: string) => void;
}) {
  return (
    <div className="tax-section">
      <h3>SEO</h3>
      <div className="settings-row cols-2">
        <Field label="Sayfa adresi" error={errors.slug} hint="Ad yazıldıkça önerilir; aynı adres iki kez kullanılamaz.">
          <span className="tax-slug">
            <span>{prefix}</span>
            <input value={slug} maxLength={80} onChange={(event) => onSlug(suggestSlug(event.target.value) || event.target.value.toLowerCase())} />
          </span>
        </Field>
        <Field label="Google başlığı" error={errors["seo.title"]} hint={`${title.length}/70`}>
          <input value={title} maxLength={70} placeholder={namePlaceholder} onChange={(event) => onTitle(event.target.value)} />
        </Field>
      </div>
      <Field label="Google açıklaması" error={errors["seo.description"]} hint={`${description.length}/180`}>
        <textarea rows={2} value={description} maxLength={180} placeholder="Boşsa açıklama kullanılır" onChange={(event) => onDescription(event.target.value)} />
      </Field>
    </div>
  );
}

export function errorMap(details: Array<{ path: string; message: string }> | undefined) {
  return Object.fromEntries((details ?? []).map((item) => [item.path, item.message]));
}
