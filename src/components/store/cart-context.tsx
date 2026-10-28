"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { ApiError, browserApi } from "@/lib/api";

export type CartItem = {
  id: string;
  quantity: number;
  unitAmount: number;
  lineAmount: number;
  variantId: string;
  variantName: string;
  productName: string;
  productSlug: string;
  isSeed: boolean;
  available?: number;
  image?: { url: string; alt: string } | null;
};

export type CartData = {
  items: CartItem[];
  subtotalAmount: number;
  discountAmount?: number;
  shippingAmount?: number;
  totalAmount?: number;
  freeShippingThreshold?: number | null;
  freeShippingRemaining?: number | null;
  minOrderAmount?: number | null;
  minOrderShortfall?: number;
  minOrderMessage?: string | null;
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
export const ADD_FAILED = "Ürün sepete eklenemedi, lütfen tekrar deneyin.";

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
    try {
      const body = await browserApi<{ data: CartData }>("/carts/current", { cache: "no-store", headers: { "x-cart-token": current } });
      setCart(body.data);
    } catch (error) {
      if (!(error instanceof ApiError && error.status === 404)) throw error;
      localStorage.removeItem(KEY);
      setCart(null);
    }
  }

  useEffect(() => {
    let cancelled = false;
    const current = localStorage.getItem(KEY);
    if (!current) return;
    browserApi<{ data: CartData }>("/carts/current", { cache: "no-store", headers: { "x-cart-token": current } })
      .then((body) => {
        if (!cancelled) setCart(body.data);
      })
      .catch((error: unknown) => {
        if (error instanceof ApiError && error.status === 404) localStorage.removeItem(KEY);
        else console.error("[cart] sepet yüklenemedi", error);
        if (!cancelled) setCart(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function postItem(current: string, variantId: string, quantity: number) {
    return browserApi<{ data: CartData }>("/carts/current/items", {
      method: "POST",
      headers: { "x-cart-token": current },
      body: JSON.stringify({ variantId, quantity }),
    });
  }

  async function cartExists(current: string) {
    try {
      await browserApi("/carts/current", { cache: "no-store", headers: { "x-cart-token": current } });
      return true;
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) return false;
      throw error;
    }
  }

  async function add(variantId: string, quantity = 1) {
    const current = await token();
    try {
      setCart((await postItem(current, variantId, quantity)).data);
    } catch (error) {
      if (!(error instanceof ApiError && error.status === 404) || await cartExists(current)) throw error;
      localStorage.removeItem(KEY);
      setCart((await postItem(await token(), variantId, quantity)).data);
    }
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
