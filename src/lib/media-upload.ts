import type { UploadedMedia } from "@/lib/editor-images";

export const UPLOAD_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const UPLOAD_ACCEPT = ".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp";
export const UPLOAD_MAX_BYTES = 8 * 1024 * 1024;

const EXTENSIONS = /\.(jpe?g|png|webp)$/i;

export type UploadInfo = { enabled: boolean; message?: string };

/** Tells the server how large the stored copy may be and how carefully it is encoded. */
export type UploadUsage = "general" | "hero" | "banner" | "product" | "logo" | "decorative";

export const UPLOAD_USAGES: { value: UploadUsage; label: string; limit: string }[] = [
  { value: "general", label: "Genel", limit: "uzun kenar en fazla 1600 px" },
  { value: "hero", label: "Hero", limit: "uzun kenar en fazla 2400 px" },
  { value: "banner", label: "Banner", limit: "uzun kenar en fazla 2400 px" },
  { value: "product", label: "Ürün", limit: "uzun kenar en fazla 1600 px" },
  { value: "logo", label: "Logo", limit: "uzun kenar en fazla 1200 px, yüksek kalite" },
  { value: "decorative", label: "Dekoratif", limit: "kısa kenar en fazla 1200 px, yüksek kalite, saydamlık korunur" },
];

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toLocaleString("tr-TR", { maximumFractionDigits: 1 })} MB`;
}

export class UploadError extends Error {}

/** Quick checks before sending; the server checks the real content again. */
export function checkUploadFile(file: File) {
  if (!UPLOAD_TYPES.includes(file.type) || !EXTENSIONS.test(file.name)) {
    return `"${file.name}" yüklenemedi: yalnızca JPG, PNG veya WebP görseller yüklenebilir.`;
  }
  if (file.size === 0) return `"${file.name}" boş bir dosya.`;
  if (file.size > UPLOAD_MAX_BYTES) return `"${file.name}" 8 MB sınırını aşıyor. Daha küçük bir görsel seçin.`;
  return null;
}

function failure(status: number, body: { error?: { message?: string } } | null) {
  if (status === 401) return "Oturumunuzun süresi dolmuş. Lütfen yeniden giriş yapıp tekrar deneyin.";
  if (status === 403) return "Görsel yüklemek için yetkiniz yok.";
  if (status === 413) return "Dosya 8 MB sınırını aşıyor. Daha küçük bir görsel seçin.";
  if (status === 429) return "Çok fazla istek gönderildi. Biraz bekleyip tekrar deneyin.";
  return body?.error?.message || "Görsel yüklenemedi. Lütfen tekrar deneyin.";
}

/** Sends one file to the media library and reports upload progress from 0 to 100. */
export function uploadMedia(file: File, onProgress: (percent: number) => void, usage: UploadUsage = "general") {
  return new Promise<UploadedMedia>((resolve, reject) => {
    const form = new FormData();
    form.append("file", file, file.name);
    const request = new XMLHttpRequest();
    request.open("POST", `/api/v1/admin/media?usage=${usage}`);
    request.withCredentials = true;
    request.setRequestHeader("accept", "application/json");
    request.responseType = "json";
    request.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(Math.min(100, Math.round((event.loaded / event.total) * 100)));
    };
    request.onload = () => {
      const body = request.response as { data?: UploadedMedia; error?: { message?: string } } | null;
      if (request.status >= 200 && request.status < 300 && body?.data) resolve(body.data);
      else reject(new UploadError(failure(request.status, body)));
    };
    request.onerror = () => reject(new UploadError("Sunucuya bağlanılamadı. İnternet bağlantınızı kontrol edip tekrar deneyin."));
    request.ontimeout = () => reject(new UploadError("Yükleme zaman aşımına uğradı. Lütfen tekrar deneyin."));
    request.send(form);
  });
}
