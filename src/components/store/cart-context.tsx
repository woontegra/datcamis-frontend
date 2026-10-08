"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { browserApi } from "@/lib/api";

type CartData = {
  items: { id: string; quantity: number; unitAmount: number; lineAmount: number; variantId: string; variantName: string; productName: string; productSlug: string; isSeed: boolean }[];
  subtotalAmount: number;
};

const CartContext = createContext<{
  count: number;
  cart: CartData | null;
  refresh: () => Promise<void>;
  add: (variantId: string, quantity?: number) => Promise<void>;
  update: (itemId: string, quantity: number) => Promise<void>;
  remove: (itemId: string) => Promise<void>;
} | null>(null);

const KEY = "dm_cart_token";

async function token() {
  const existing = localStorage.getItem(KEY);
  if (existing) return existing;
  const created = await browserApi<{ data: { token: string } }>("/carts", { method: "POST" });
  localStorage.setItem(KEY, created.data.token);
  return created.data.token;
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<CartData | null>(null);

  async function refresh() {
    const current = localStorage.getItem(KEY);
    if (!current) {
      setCart(null);
      return;
    }
    const body = await browserApi<{ data: CartData }>("/carts/current", { headers: { "x-cart-token": current } });
    setCart(body.data);
  }

  useEffect(() => {
    let cancelled = false;
    const current = localStorage.getItem(KEY);
    if (!current) return;
    browserApi<{ data: CartData }>("/carts/current", { headers: { "x-cart-token": current } })
      .then((body) => {
        if (!cancelled) setCart(body.data);
      })
      .catch(() => {
        if (!cancelled) setCart(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function add(variantId: string, quantity = 1) {
    const current = await token();
    const body = await browserApi<{ data: CartData }>("/carts/current/items", {
      method: "POST",
      headers: { "x-cart-token": current },
      body: JSON.stringify({ variantId, quantity }),
    });
    setCart(body.data);
  }

  async function update(itemId: string, quantity: number) {
    const current = await token();
    const body = await browserApi<{ data: CartData }>(`/carts/current/items/${itemId}`, {
      method: "PATCH",
      headers: { "x-cart-token": current },
      body: JSON.stringify({ quantity }),
    });
    setCart(body.data);
  }

  async function remove(itemId: string) {
    const current = await token();
    const body = await browserApi<{ data: CartData }>(`/carts/current/items/${itemId}`, {
      method: "DELETE",
      headers: { "x-cart-token": current },
    });
    setCart(body.data);
  }

  const count = cart?.items.reduce((sum, item) => sum + item.quantity, 0) ?? 0;
  return <CartContext.Provider value={{ count, cart, refresh, add, update, remove }}>{children}</CartContext.Provider>;
}

export function useCart() {
  const value = useContext(CartContext);
  if (!value) throw new Error("CartProvider eksik");
  return value;
}
