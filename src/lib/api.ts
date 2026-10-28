export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string,
    public details?: Array<{ path: string; message: string }>,
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
    throw new ApiError(response.status, body?.error?.message || "İstek başarısız.", body?.error?.code, body?.error?.details);
  }
  return body as T;
}

export async function browserApi<T>(path: string, init?: RequestInit): Promise<T> {
  const method = init?.method || "GET";
  let response: Response;
  try {
    response = await fetch(`/api/v1${path}`, {
      ...init,
      credentials: "include",
      headers: {
        accept: "application/json",
        ...(init?.body ? { "content-type": "application/json" } : {}),
        ...init?.headers,
      },
    });
  } catch (error) {
    console.error(`[api] ${method} ${path} ağ hatası`, error);
    throw new ApiError(0, "Bağlantı kurulamadı.", "NETWORK_ERROR");
  }
  if (response.status === 204) return undefined as T;
  const body = await response.json().catch((error: unknown) => {
    console.error(`[api] ${method} ${path} yanıtı okunamadı (HTTP ${response.status})`, error);
    return null;
  });
  if (!response.ok) {
    throw new ApiError(response.status, body?.error?.message || "İstek başarısız.", body?.error?.code, body?.error?.details);
  }
  if (body === null || typeof body !== "object") {
    throw new ApiError(response.status, "Sunucudan geçersiz yanıt alındı.", "INVALID_RESPONSE");
  }
  return body as T;
}

const RAW_ERROR_CODES = new Set(["REQUEST_ERROR", "INVALID_RESPONSE", "NETWORK_ERROR", "UPSTREAM_UNAVAILABLE"]);

export function customerMessage(error: unknown, fallback: string) {
  if (error instanceof ApiError && error.status >= 400 && error.status < 500 && error.code && !RAW_ERROR_CODES.has(error.code) && error.message) {
    return error.message;
  }
  console.error("[api] müşteriye genel mesaj gösterildi", error);
  return fallback;
}
