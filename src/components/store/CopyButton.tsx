"use client";

import { useState } from "react";

export function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(value);
      else throw new Error("clipboard");
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      try {
        const field = document.createElement("textarea");
        field.value = value;
        field.setAttribute("readonly", "");
        field.style.position = "fixed";
        field.style.left = "-9999px";
        document.body.appendChild(field);
        field.select();
        document.execCommand("copy");
        field.remove();
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1600);
      } catch {
        setCopied(false);
      }
    }
  }
  return (
    <button className="thanks-copy" type="button" onClick={() => void copy()} aria-label={`${label} kopyala`}>
      <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
        <rect x="8" y="8" width="11" height="11" rx="2" fill="none" stroke="currentColor" strokeWidth="1.7" />
        <path d="M5 15V5h10" fill="none" stroke="currentColor" strokeWidth="1.7" />
      </svg>
      {copied ? "Kopyalandı" : "Kopyala"}
    </button>
  );
}