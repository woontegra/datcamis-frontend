"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { browserApi } from "@/lib/api";
import "./login.css";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  return (
    <main className="admin-login">
      <img className="admin-login-grove" src="/home/garden-new.png" alt="" />
      <form
        className="admin-login-card"
        onSubmit={async (event) => {
          event.preventDefault();
          const data = new FormData(event.currentTarget);
          setError("");
          try {
            await browserApi("/admin/auth/login", {
              method: "POST",
              body: JSON.stringify({ email: data.get("email"), password: data.get("password") }),
            });
            router.push("/admin");
            router.refresh();
          } catch (err) {
            setError(err instanceof Error ? err.message : "Giriş yapılamadı.");
          }
        }}
      >
        <p className="admin-login-kicker">Yönetim</p>
        <h1 className="admin-login-title">DatçaMis</h1>
        <label className="admin-login-field">
          E-posta
          <span className="admin-login-control">
            <MailIcon />
            <input name="email" type="email" autoComplete="username" placeholder="E-posta adresiniz" required />
          </span>
        </label>
        <label className="admin-login-field">
          Şifre
          <span className="admin-login-control">
            <LockIcon />
            <input
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              placeholder="Şifreniz"
              required
            />
            <button
              className="admin-login-reveal"
              type="button"
              aria-label={showPassword ? "Şifreyi gizle" : "Şifreyi göster"}
              aria-pressed={showPassword}
              onClick={() => setShowPassword((value) => !value)}
            >
              {showPassword ? <EyeOffIcon /> : <EyeIcon />}
            </button>
          </span>
        </label>
        <button className="admin-login-submit" type="submit">
          Giriş <span aria-hidden="true">→</span>
        </button>
        {error ? <p className="admin-login-error">{error}</p> : null}
      </form>
    </main>
  );
}

function MailIcon() {
  return (
    <svg className="admin-login-icon" viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3.5" y="5.5" width="17" height="13" rx="2" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path d="M4 7l8 6 8-6" fill="none" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg className="admin-login-icon" viewBox="0 0 24 24" aria-hidden="true">
      <rect x="5.5" y="10.5" width="13" height="9" rx="2" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M2.5 12S6 6.5 12 6.5 21.5 12 21.5 12 18 17.5 12 17.5 2.5 12 2.5 12Z" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="12" cy="12" r="2.4" fill="none" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M3 4.5l18 15" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path d="M9.2 9.4A3.2 3.2 0 0 0 12 15.2c.7 0 1.3-.2 1.8-.6M6.2 7.2C4.2 8.6 2.8 10.6 2.5 12c0 0 3.5 5.5 9.5 5.5 1.3 0 2.5-.3 3.6-.8M14.2 8.1A8.8 8.8 0 0 1 21.5 12c-.2.6-1.6 2.6-4 4" fill="none" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}
