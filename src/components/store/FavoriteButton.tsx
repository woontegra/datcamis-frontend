"use client";

import { useSyncExternalStore } from "react";

const KEY = "dm_favorites";
const EVENT = "dm-favorites";

export function readFavorites() {
  if (typeof window === "undefined") return [] as string[];
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) || "[]");
    return Array.isArray(parsed) ? parsed.filter((item) => typeof item === "string") : [];
  } catch {
    return [];
  }
}

function subscribe(callback: () => void) {
  window.addEventListener(EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

function snapshot() {
  return readFavorites().join("|");
}

export function useFavoriteSlugs() {
  const value = useSyncExternalStore(subscribe, snapshot, () => "");
  return value ? value.split("|") : [];
}

export function toggleFavorite(slug: string) {
  const next = new Set(readFavorites());
  if (next.has(slug)) next.delete(slug);
  else next.add(slug);
  localStorage.setItem(KEY, JSON.stringify([...next]));
  window.dispatchEvent(new Event(EVENT));
}

export function FavoriteButton({ slug, appearance = "text" }: { slug: string; appearance?: "text" | "icon" }) {
  const slugs = useFavoriteSlugs();
  const on = slugs.includes(slug);
  if (appearance === "icon") {
    return (
      <button className="fav-icon" type="button" aria-pressed={on} aria-label={on ? "Favorilerden çıkar" : "Favorilere ekle"} onClick={() => toggleFavorite(slug)}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill={on ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
          <path d="M12 19s-7-4.4-7-9a4 4 0 0 1 7-2 4 4 0 0 1 7 2c0 4.6-7 9-7 9z" />
        </svg>
      </button>
    );
  }
  return (
    <button className="text-btn" type="button" aria-pressed={on} onClick={() => toggleFavorite(slug)}>
      {on ? "Favorilerde" : "Favorilere ekle"}
    </button>
  );
}
