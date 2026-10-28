"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { PASSWORD_MISMATCH, PasswordInput } from "@/components/account/AuthForms";
import { useCustomer } from "@/components/store/customer-context";
import { ApiError, browserApi, customerMessage } from "@/lib/api";
import type { Customer } from "@/lib/account";

function FieldError({ message }: { message?: string }) {
  return <span className="field-error">{message || "\u00a0"}</span>;
}

function errorMap(error: unknown) {
  if (error instanceof ApiError && error.details?.length) {
    return Object.fromEntries(error.details.map((item) => [item.path, item.message]));
  }
  return {};
}

export function ProfileForm({ initial }: { initial: Customer }) {
  const router = useRouter();
  const { setCustomer } = useCustomer();
  const [form, setForm] = useState({ firstName: initial.firstName, lastName: initial.lastName, phone: initial.phone });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");
  const [notice, setNotice] = useState("");
  const [pending, setPending] = useState(false);

  async function submit() {
    const nextErrors: Record<string, string> = {};
    if (form.firstName.trim().length < 2) nextErrors.firstName = "Ad en az 2 karakter olmalı.";
    if (form.lastName.trim().length < 2) nextErrors.lastName = "Soyad en az 2 karakter olmalı.";
    if (form.phone.trim() && form.phone.replace(/\D/g, "").length < 10) nextErrors.phone = "Telefon numarasını kontrol edin.";
    setErrors(nextErrors);
    setMessage("");
    setNotice("");
    if (Object.keys(nextErrors).length) return;
    setPending(true);
    try {
      const body = await browserApi<{ data: Customer }>("/account/profile", {
        method: "PATCH",
        body: JSON.stringify({ firstName: form.firstName.trim(), lastName: form.lastName.trim(), phone: form.phone.trim() || undefined }),
      });
      setCustomer(body.data);
      setNotice("Bilgileriniz kaydedildi.");
      router.refresh();
    } catch (error) {
      setErrors(errorMap(error));
      setMessage(customerMessage(error, "Kaydedilemedi."));
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="checkout-block account-form" noValidate onSubmit={(event) => { event.preventDefault(); void submit(); }}>
      <h2>Profil bilgileri</h2>
      <div className="form-grid two">
        <label className="field">Ad
          <input name="firstName" autoComplete="given-name" value={form.firstName} onChange={(event) => setForm((current) => ({ ...current, firstName: event.target.value }))} />
          <FieldError message={errors.firstName} />
        </label>
        <label className="field">Soyad
          <input name="lastName" autoComplete="family-name" value={form.lastName} onChange={(event) => setForm((current) => ({ ...current, lastName: event.target.value }))} />
          <FieldError message={errors.lastName} />
        </label>
        <label className="field">E-posta
          <input type="email" value={initial.email} readOnly disabled />
          <span className="field-hint">E-posta adresi şu an değiştirilemiyor.</span>
        </label>
        <label className="field">Telefon (isteğe bağlı)
          <input name="phone" type="tel" inputMode="tel" autoComplete="tel" value={form.phone} onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))} />
          <FieldError message={errors.phone} />
        </label>
      </div>
      {message ? <p className="error" role="alert">{message}</p> : null}
      {notice ? <p className="account-notice" role="status">{notice}</p> : null}
      <div className="account-form-actions">
        <button className="green-btn" type="submit" disabled={pending}>{pending ? "Kaydediliyor…" : "Kaydet"}</button>
      </div>
    </form>
  );
}

export function PasswordForm() {
  const [form, setForm] = useState({ currentPassword: "", newPassword: "", newPasswordConfirm: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");
  const [notice, setNotice] = useState("");
  const [pending, setPending] = useState(false);

  function set(key: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function submit() {
    const nextErrors: Record<string, string> = {};
    if (!form.currentPassword) nextErrors.currentPassword = "Mevcut şifrenizi girin.";
    if (form.newPassword.length < 8) nextErrors.newPassword = "Şifre en az 8 karakter olmalı.";
    if (form.newPasswordConfirm !== form.newPassword) nextErrors.newPasswordConfirm = PASSWORD_MISMATCH;
    setErrors(nextErrors);
    setMessage("");
    setNotice("");
    if (Object.keys(nextErrors).length) return;
    setPending(true);
    try {
      await browserApi("/account/password", {
        method: "POST",
        body: JSON.stringify({ currentPassword: form.currentPassword, newPassword: form.newPassword, newPasswordConfirm: form.newPasswordConfirm }),
      });
      setForm({ currentPassword: "", newPassword: "", newPasswordConfirm: "" });
      setNotice("Şifreniz değiştirildi. Diğer cihazlardaki oturumlarınız kapatıldı.");
    } catch (error) {
      setErrors(errorMap(error));
      setMessage(customerMessage(error, "Şifre değiştirilemedi."));
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="checkout-block account-form" noValidate onSubmit={(event) => { event.preventDefault(); void submit(); }}>
      <h2>Şifre değiştir</h2>
      <div className="form-grid two">
        <label className="field span-2">Mevcut şifre
          <input name="currentPassword" type="password" autoComplete="current-password" value={form.currentPassword} onChange={(event) => set("currentPassword", event.target.value)} />
          <FieldError message={errors.currentPassword} />
        </label>
        <label className="field">Yeni şifre (en az 8 karakter)
          <PasswordInput name="newPassword" autoComplete="new-password" value={form.newPassword} onChange={(value) => set("newPassword", value)} />
          <FieldError message={errors.newPassword} />
        </label>
        <label className="field">Yeni şifre (tekrar)
          <PasswordInput name="newPasswordConfirm" autoComplete="new-password" value={form.newPasswordConfirm} onChange={(value) => set("newPasswordConfirm", value)} />
          <FieldError message={errors.newPasswordConfirm} />
        </label>
      </div>
      {message ? <p className="error" role="alert">{message}</p> : null}
      {notice ? <p className="account-notice" role="status">{notice}</p> : null}
      <div className="account-form-actions">
        <button className="green-btn" type="submit" disabled={pending}>{pending ? "Değiştiriliyor…" : "Şifreyi değiştir"}</button>
      </div>
    </form>
  );
}
