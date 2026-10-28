"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useCustomer } from "@/components/store/customer-context";
import { ApiError, browserApi, customerMessage } from "@/lib/api";
import { safeNext, type Customer } from "@/lib/account";

function FieldError({ message }: { message?: string }) {
  return <span className="field-error">{message || "\u00a0"}</span>;
}

export const PASSWORD_MISMATCH = "Şifreler eşleşmiyor.";

export function PasswordInput({ value, onChange, autoComplete, name }: { value: string; onChange: (value: string) => void; autoComplete: string; name: string }) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="auth-password">
      <input name={name} type={visible ? "text" : "password"} autoComplete={autoComplete} value={value} onChange={(event) => onChange(event.target.value)} />
      <button type="button" className="auth-password-toggle" aria-pressed={visible} onClick={() => setVisible((current) => !current)}>
        {visible ? "Gizle" : "Göster"}
      </button>
    </div>
  );
}

function errorMap(error: unknown) {
  if (error instanceof ApiError && error.details?.length) {
    return Object.fromEntries(error.details.map((item) => [item.path, item.message]));
  }
  return {};
}

export function LoginForm({ next }: { next?: string }) {
  const router = useRouter();
  const { setCustomer } = useCustomer();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");
  const [forgot, setForgot] = useState(false);
  const [pending, setPending] = useState(false);

  async function submit() {
    const nextErrors: Record<string, string> = {};
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) nextErrors.email = "Geçerli bir e-posta girin.";
    if (!password) nextErrors.password = "Şifrenizi girin.";
    setErrors(nextErrors);
    setMessage("");
    if (Object.keys(nextErrors).length) return;
    setPending(true);
    try {
      const body = await browserApi<{ data: Customer }>("/account/login", {
        method: "POST",
        body: JSON.stringify({ email: email.trim(), password }),
      });
      setCustomer(body.data);
      router.replace(safeNext(next));
      router.refresh();
    } catch (error) {
      setErrors(errorMap(error));
      setMessage(customerMessage(error, "Giriş yapılamadı."));
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="checkout-block auth-card" noValidate onSubmit={(event) => { event.preventDefault(); void submit(); }}>
      <label className="field">E-posta
        <input name="email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} />
        <FieldError message={errors.email} />
      </label>
      <label className="field">Şifre
        <PasswordInput name="password" autoComplete="current-password" value={password} onChange={setPassword} />
        <FieldError message={errors.password} />
      </label>
      <button type="button" className="auth-link-btn" onClick={() => setForgot((current) => !current)}>Şifremi unuttum</button>
      {forgot ? <p className="auth-note">Şifre sıfırlama yakında eklenecek.</p> : null}
      {message ? <p className="error" role="alert">{message}</p> : null}
      <button className="green-btn auth-submit" type="submit" disabled={pending}>{pending ? "Giriş yapılıyor…" : "Giriş yap"}</button>
      <p className="auth-switch">Hesabınız yok mu? <Link href={next ? `/kayit?next=${encodeURIComponent(next)}` : "/kayit"}>Hesap oluşturun</Link></p>
    </form>
  );
}

export function RegisterForm({ next }: { next?: string }) {
  const router = useRouter();
  const { setCustomer } = useCustomer();
  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", phone: "", password: "", passwordConfirm: "" });
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [marketingOptIn, setMarketingOptIn] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function submit() {
    const nextErrors: Record<string, string> = {};
    if (form.firstName.trim().length < 2) nextErrors.firstName = "Ad en az 2 karakter olmalı.";
    if (form.lastName.trim().length < 2) nextErrors.lastName = "Soyad en az 2 karakter olmalı.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) nextErrors.email = "Geçerli bir e-posta girin.";
    if (form.phone.trim() && form.phone.replace(/\D/g, "").length < 10) nextErrors.phone = "Telefon numarasını kontrol edin.";
    if (form.password.length < 8) nextErrors.password = "Şifre en az 8 karakter olmalı.";
    if (form.passwordConfirm !== form.password) nextErrors.passwordConfirm = PASSWORD_MISMATCH;
    if (!privacyAccepted) nextErrors.privacyAccepted = "Aydınlatma Metni’ni okuduğunuzu onaylayın.";
    setErrors(nextErrors);
    setMessage("");
    if (Object.keys(nextErrors).length) return;
    setPending(true);
    try {
      const body = await browserApi<{ data: Customer }>("/account/register", {
        method: "POST",
        body: JSON.stringify({
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          email: form.email.trim(),
          phone: form.phone.trim() || undefined,
          password: form.password,
          passwordConfirm: form.passwordConfirm,
          privacyAccepted: true,
          marketingOptIn,
        }),
      });
      setCustomer(body.data);
      router.replace(safeNext(next));
      router.refresh();
    } catch (error) {
      setErrors(errorMap(error));
      setMessage(customerMessage(error, "Hesap oluşturulamadı."));
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="checkout-block auth-card" noValidate onSubmit={(event) => { event.preventDefault(); void submit(); }}>
      <div className="form-grid two">
        <label className="field">Ad
          <input name="firstName" autoComplete="given-name" value={form.firstName} onChange={(event) => set("firstName", event.target.value)} />
          <FieldError message={errors.firstName} />
        </label>
        <label className="field">Soyad
          <input name="lastName" autoComplete="family-name" value={form.lastName} onChange={(event) => set("lastName", event.target.value)} />
          <FieldError message={errors.lastName} />
        </label>
        <label className="field span-2">E-posta
          <input name="email" type="email" autoComplete="email" value={form.email} onChange={(event) => set("email", event.target.value)} />
          <FieldError message={errors.email} />
        </label>
        <label className="field span-2">Telefon (isteğe bağlı)
          <input name="phone" type="tel" inputMode="tel" autoComplete="tel" value={form.phone} onChange={(event) => set("phone", event.target.value)} />
          <FieldError message={errors.phone} />
        </label>
        <label className="field span-2">Şifre (en az 8 karakter)
          <PasswordInput name="password" autoComplete="new-password" value={form.password} onChange={(value) => set("password", value)} />
          <FieldError message={errors.password} />
        </label>
        <label className="field span-2">Şifre (tekrar)
          <PasswordInput name="passwordConfirm" autoComplete="new-password" value={form.passwordConfirm} onChange={(value) => set("passwordConfirm", value)} />
          <FieldError message={errors.passwordConfirm} />
        </label>
      </div>
      <div className="auth-checks">
        <label className="field-check terms-check">
          <input type="checkbox" checked={privacyAccepted} aria-invalid={Boolean(errors.privacyAccepted)} onChange={(event) => setPrivacyAccepted(event.target.checked)} />
          <span>
            Kişisel verilerin işlenmesine ilişkin{" "}
            <a href="/sayfa/aydinlatma-metni" target="_blank" rel="noopener noreferrer">Aydınlatma Metni</a>
            ’ni okudum.
          </span>
        </label>
        {errors.privacyAccepted ? <span className="field-error auth-check-error">{errors.privacyAccepted}</span> : null}
        <label className="field-check terms-check">
          <input type="checkbox" checked={marketingOptIn} onChange={(event) => setMarketingOptIn(event.target.checked)} />
          <span>Kampanya ve yeniliklerden e-posta ile haberdar olmak istiyorum.</span>
        </label>
      </div>
      {message ? <p className="error" role="alert">{message}</p> : null}
      <button className="green-btn auth-submit" type="submit" disabled={pending}>{pending ? "Hesap oluşturuluyor…" : "Hesap oluştur"}</button>
      <p className="auth-switch">Hesabınız var mı? <Link href={next ? `/giris?next=${encodeURIComponent(next)}` : "/giris"}>Giriş yapın</Link></p>
    </form>
  );
}
