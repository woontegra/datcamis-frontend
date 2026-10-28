"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { browserApi } from "@/lib/api";
import type { Customer } from "@/lib/account";

const CustomerContext = createContext<{
  customer: Customer | null;
  ready: boolean;
  setCustomer: (customer: Customer | null) => void;
  refresh: () => Promise<Customer | null>;
  logout: () => Promise<void>;
} | null>(null);

export function CustomerProvider({ children }: { children: React.ReactNode }) {
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [ready, setReady] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const body = await browserApi<{ data: Customer | null }>("/account/session", { cache: "no-store" });
      setCustomer(body.data);
      return body.data;
    } catch {
      setCustomer(null);
      return null;
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    browserApi<{ data: Customer | null }>("/account/session", { cache: "no-store" })
      .then((body) => body.data)
      .catch(() => null)
      .then((data) => {
        if (cancelled) return;
        setCustomer(data);
        setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const logout = useCallback(async () => {
    await browserApi("/account/logout", { method: "POST" }).catch(() => null);
    setCustomer(null);
  }, []);

  return (
    <CustomerContext.Provider value={{ customer, ready, setCustomer, refresh, logout }}>
      {children}
    </CustomerContext.Provider>
  );
}

const anonymous = {
  customer: null,
  ready: true,
  setCustomer: () => {},
  refresh: async () => null,
  logout: async () => {},
};

export function useCustomer() {
  return useContext(CustomerContext) ?? anonymous;
}
