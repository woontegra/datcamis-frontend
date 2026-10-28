"use client";

import { useState } from "react";
import { ApiError, browserApi } from "@/lib/api";

export type HavaleSettings = {
  enabled: boolean;
  bankName: string;
  accountHolder: string;
  iban: string;
  note: string;
};

export function HavaleSettingsForm({ initial }: { initial: HavaleSettings }) {
  const [form, setForm] = useState(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  function set<K extends keyof HavaleSettings>(key: K, value: HavaleSettings[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  return (
    <form
      className="panel-admin"
      onSubmit={async (event) => {
        event.preventDefault();
        setBusy(true);
        setMessage("");
        setErrors({});
        try {
          const saved = await browserApi<{ data: HavaleSettings }>("/admin/settings/havale", {
            method: "PUT",
            body: JSON.stringify(form),
          });
          setForm(saved.data);
          setMessage("Kaydedildi.");
        } catch (error) {
          if (error instanceof ApiError && error.details?.length) {
            setErrors(Object.fromEntries(error.details.map((item) => [item.path, item.message])));
            setMessage(error.message);
          } else {
            setMessage(error instanceof Error ? error.message : "Kaydedilemedi.");
          }
        } finally {
          setBusy(false);
        }
      }}
    >
      <h2>Havale / EFT</h2>
      <label className="field-check">
        <input type="checkbox" checked={form.enabled} onChange={(event) => set("enabled", event.target.checked)} />
        Aktif
      </label>
      <label className="field">Banka adı
        <input value={form.bankName} onChange={(event) => set("bankName", event.target.value)} />
        {errors.bankName ? <span className="field-error">{errors.bankName}</span> : null}
      </label>
      <label className="field">Hesap sahibi
        <input value={form.accountHolder} onChange={(event) => set("accountHolder", event.target.value)} />
        {errors.accountHolder ? <span className="field-error">{errors.accountHolder}</span> : null}
      </label>
      <label className="field">IBAN
        <input value={form.iban} onChange={(event) => set("iban", event.target.value.toUpperCase())} autoComplete="off" />
        {errors.iban ? <span className="field-error">{errors.iban}</span> : null}
      </label>
      <label className="field">Müşteri notu
        <textarea rows={3} value={form.note} onChange={(event) => set("note", event.target.value)} />
      </label>
      <button className="green-btn" type="submit" disabled={busy}>Kaydet</button>
      {message ? <p className={errors.iban || errors.bankName ? "error" : undefined}>{message}</p> : null}
    </form>
  );
}
