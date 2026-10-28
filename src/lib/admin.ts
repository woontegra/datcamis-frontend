import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ApiError } from "./api";

/** True when the visitor carries a valid staff session; never redirects. */
export async function hasStaffSession() {
  const access = (await cookies()).get("dm_access")?.value;
  if (!access) return false;
  try {
    const response = await fetch(`${process.env.API_URL || "http://127.0.0.1:4010"}/api/v1/admin/auth/me`, {
      cache: "no-store",
      headers: { accept: "application/json", cookie: `dm_access=${access}` },
    });
    return response.ok;
  } catch {
    return false;
  }
}

export async function adminApi<T>(path: string): Promise<T> {
  const jar = await cookies();
  const access = jar.get("dm_access")?.value;
  const response = await fetch(`${process.env.API_URL || "http://127.0.0.1:4010"}/api/v1${path}`, {
    cache: "no-store",
    headers: { accept: "application/json", cookie: access ? `dm_access=${access}` : "" },
  });
  const body = await response.json().catch(() => null);
  if (response.status === 401) redirect("/admin/login");
  if (!response.ok) throw new ApiError(response.status, body?.error?.message || "İstek başarısız.", body?.error?.code);
  return body as T;
}
