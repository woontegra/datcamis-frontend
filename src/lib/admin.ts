import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ApiError } from "./api";

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
