import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ApiError } from "./api";
import type { Customer } from "./account";

const apiBase = () => process.env.API_URL || "http://127.0.0.1:4010";

async function sessionCookie() {
  const jar = await cookies();
  const value = jar.get("dm_customer")?.value;
  return value ? `dm_customer=${value}` : "";
}

export async function currentCustomer(): Promise<Customer | null> {
  const cookie = await sessionCookie();
  if (!cookie) return null;
  const response = await fetch(`${apiBase()}/api/v1/account/session`, {
    cache: "no-store",
    headers: { accept: "application/json", cookie },
  });
  if (!response.ok) return null;
  const body = await response.json().catch(() => null);
  return (body?.data as Customer | null) ?? null;
}

export async function customerApi<T>(path: string, nextPath: string): Promise<T> {
  const cookie = await sessionCookie();
  if (!cookie) redirect(`/giris?next=${encodeURIComponent(nextPath)}`);
  const response = await fetch(`${apiBase()}/api/v1${path}`, {
    cache: "no-store",
    headers: { accept: "application/json", cookie },
  });
  const body = await response.json().catch(() => null);
  if (response.status === 401) redirect(`/giris?next=${encodeURIComponent(nextPath)}`);
  if (!response.ok) throw new ApiError(response.status, body?.error?.message || "İstek başarısız.", body?.error?.code);
  return body as T;
}
