"use client";

import { useState } from "react";
import { AddressFields } from "@/components/store/AddressFields";
import { ApiError, browserApi, customerMessage } from "@/lib/api";
import { addressLines, type Customer, type SavedAddress } from "@/lib/account";
import { validateAddress } from "@/lib/invoice";

type Draft = { fullName: string; phone: string; line1: string; district: string; city: string; postalCode: string; country: string };

function toDraft(address: SavedAddress): Draft {
  return {
    fullName: address.fullName,
    phone: address.phone,
    line1: [address.line1, address.line2].filter((part) => part && part.trim()).join(", "),
    district: address.district,
    city: address.city,
    postalCode: address.postalCode,
    country: "TR",
  };
}

export function AddressBook({ initial, customer }: { initial: SavedAddress[]; customer: Customer }) {
  const [addresses, setAddresses] = useState(initial);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [makeDefault, setMakeDefault] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");
  const [notice, setNotice] = useState("");
  const [pending, setPending] = useState(false);

  function openNew() {
    setEditing("new");
    setDraft({ fullName: `${customer.firstName} ${customer.lastName}`.trim(), phone: customer.phone, line1: "", district: "", city: "", postalCode: "", country: "TR" });
    setMakeDefault(addresses.length === 0);
    setErrors({});
    setMessage("");
    setNotice("");
  }

  function openEdit(address: SavedAddress) {
    setEditing(address.id);
    setDraft(toDraft(address));
    setMakeDefault(address.isDefault);
    setErrors({});
    setMessage("");
    setNotice("");
  }

  function close() {
    setEditing(null);
    setDraft(null);
    setErrors({});
    setMessage("");
  }

  async function run(action: () => Promise<{ data: SavedAddress[] }>, done: string) {
    setPending(true);
    setMessage("");
    try {
      const body = await action();
      setAddresses(body.data);
      setNotice(done);
      return true;
    } catch (error) {
      if (error instanceof ApiError && error.details?.length) {
        setErrors(Object.fromEntries(error.details.map((item) => [item.path, item.message])));
      }
      setMessage(customerMessage(error, "İşlem tamamlanamadı."));
      return false;
    } finally {
      setPending(false);
    }
  }

  async function save() {
    if (!draft) return;
    const nextErrors = validateAddress("", draft);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    const payload = JSON.stringify({ ...draft, line2: "", isDefault: makeDefault });
    const ok = editing === "new"
      ? await run(() => browserApi("/account/addresses", { method: "POST", body: payload }), "Adres eklendi.")
      : await run(() => browserApi(`/account/addresses/${editing}`, { method: "PATCH", body: payload }), "Adres güncellendi.");
    if (ok) close();
  }

  async function remove(address: SavedAddress) {
    if (!window.confirm("Bu adres silinsin mi? Geçmiş siparişleriniz etkilenmez.")) return;
    if (editing === address.id) close();
    await run(() => browserApi(`/account/addresses/${address.id}`, { method: "DELETE" }), "Adres silindi.");
  }

  async function setDefault(address: SavedAddress) {
    await run(() => browserApi(`/account/addresses/${address.id}/default`, { method: "POST" }), "Varsayılan teslimat adresi güncellendi.");
  }

  const form = draft ? (
    <form className="checkout-block account-address-form" noValidate onSubmit={(event) => { event.preventDefault(); void save(); }}>
      <h2>{editing === "new" ? "Yeni adres" : "Adresi düzenle"}</h2>
      <AddressFields value={draft} onChange={setDraft} errors={errors} errorPrefix="">
        <label className="field-check span-2">
          <input type="checkbox" checked={makeDefault} onChange={(event) => setMakeDefault(event.target.checked)} />
          Varsayılan teslimat adresim olsun
        </label>
      </AddressFields>
      {message ? <p className="error" role="alert">{message}</p> : null}
      <div className="account-form-actions">
        <button className="green-btn" type="submit" disabled={pending}>{pending ? "Kaydediliyor…" : "Kaydet"}</button>
        <button className="text-btn" type="button" onClick={close}>Vazgeç</button>
      </div>
    </form>
  ) : null;

  return (
    <section className="account-section">
      <div className="account-section-head">
        <h2>Adreslerim</h2>
        {editing ? null : <button className="green-btn account-btn" type="button" onClick={openNew}>Yeni adres ekle</button>}
      </div>
      {notice ? <p className="account-notice" role="status">{notice}</p> : null}
      {editing === "new" ? form : null}
      {!addresses.length && editing !== "new" ? (
        <div className="checkout-block account-empty">
          <p>Kayıtlı adresiniz yok. Adres ekleyerek ödemede hızlıca seçebilirsiniz.</p>
        </div>
      ) : null}
      <div className="account-addresses">
        {addresses.map((address) => (
          editing === address.id ? <div key={address.id} className="account-address-edit">{form}</div> : (
            <article key={address.id} className={`checkout-block account-address ${address.isDefault ? "is-default" : ""}`}>
              <header>
                <strong>{address.fullName}</strong>
                {address.isDefault ? <span className="account-badge is-default">Varsayılan</span> : null}
              </header>
              <p className="account-text">{addressLines(address).slice(1).map((line, index) => <span key={index}>{line}<br /></span>)}</p>
              <div className="account-address-actions">
                {address.isDefault ? null : (
                  <button type="button" className="auth-link-btn" disabled={pending} onClick={() => void setDefault(address)}>Varsayılan yap</button>
                )}
                <button type="button" className="auth-link-btn" disabled={pending} onClick={() => openEdit(address)}>Düzenle</button>
                <button type="button" className="auth-link-btn is-danger" disabled={pending} onClick={() => void remove(address)}>Sil</button>
              </div>
            </article>
          )
        ))}
      </div>
    </section>
  );
}
