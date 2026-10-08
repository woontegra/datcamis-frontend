export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string,
  ) {
    super(message);
  }
}

const serverBase = () => process.env.API_URL || "http://127.0.0.1:4010";

export async function serverApi<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${serverBase()}/api/v1${path}`, {
    ...init,
    cache: "no-store",
    headers: { accept: "application/json", ...init?.headers },
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw new ApiError(response.status, body?.error?.message || "İstek başarısız.", body?.error?.code);
  }
  return body as T;
}

export async function browserApi<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api/v1${path}`, {
    ...init,
    credentials: "include",
    headers: {
      accept: "application/json",
      ...(init?.body ? { "content-type": "application/json" } : {}),
      ...init?.headers,
    },
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw new ApiError(response.status, body?.error?.message || "İstek başarısız.", body?.error?.code);
  }
  return body as T;
}
