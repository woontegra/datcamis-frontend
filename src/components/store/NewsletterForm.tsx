"use client";

import { useState } from "react";
import { browserApi } from "@/lib/api";

export function NewsletterForm({ title = "Bahçeden haber", text = "Yeni notlar için e-posta bırakın. Bu kayıt geliştirme ortamındadır." }: { title?: string; text?: string }) {
  const [message, setMessage] = useState("");
  return (
    <form
      className="field"
      onSubmit={async (event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        setMessage("");
        try {
          await browserApi("/newsletter", { method: "POST", body: JSON.stringify({ email: data.get("email") }) });
          setMessage("Kayıt alındı.");
          event.currentTarget.reset();
        } catch (error) {
          setMessage(error instanceof Error ? error.message : "Kayıt alınamadı.");
        }
      }}
    >
      <p className="eyebrow">Bülten</p>
      <strong>{title}</strong>
      <p>{text}</p>
      <input name="email" type="email" required placeholder="E-posta" aria-label="E-posta" />
      <button className="green-btn" type="submit">Kaydol</button>
      {message ? <p>{message}</p> : null}
    </form>
  );
}
