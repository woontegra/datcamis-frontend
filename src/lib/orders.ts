export const ORDER_STATUS_FILTERS = [
  { value: "", label: "Tümü" },
  { value: "NEW", label: "Yeni" },
  { value: "PROCESSING", label: "Hazırlanıyor" },
  { value: "SHIPPED", label: "Kargoda" },
  { value: "DELIVERED", label: "Teslim Edildi" },
  { value: "CANCELLED", label: "İptal" },
  { value: "RETURNED", label: "İade" },
] as const;

export const ORDER_STATUS_LABEL: Record<string, string> = {
  PENDING: "Yeni",
  CONFIRMED: "Yeni",
  PROCESSING: "Hazırlanıyor",
  SHIPPED: "Kargoda",
  DELIVERED: "Teslim Edildi",
  CANCELLED: "İptal",
  RETURNED: "İade",
};

export const PAYMENT_STATUS_LABEL: Record<string, string> = {
  PENDING: "Ödeme Bekleniyor",
  PAID: "Ödendi",
  REFUNDED: "İade Edildi",
  FAILED: "Ödeme Başarısız",
};

export const CARGO_CARRIERS = ["Yurtiçi Kargo", "Aras Kargo", "MNG Kargo", "PTT Kargo", "Sürat Kargo", "UPS"] as const;

export const CANCEL_REASONS = ["Müşteri vazgeçti", "Stok yok", "Ödeme alınamadı", "Adres sorunu", "Diğer"] as const;

export function cargoTrackUrl(carrier: string, trackingNumber: string) {
  const code = trackingNumber.trim();
  if (!code) return null;
  const encoded = encodeURIComponent(code);
  if (carrier === "Yurtiçi Kargo") return `https://www.yurticikargo.com/tr/online-servisler/gonderi-sorgula?code=${encoded}`;
  if (carrier === "Aras Kargo") return `https://kargotakip.araskargo.com.tr/mainpage.aspx?code=${encoded}`;
  if (carrier === "MNG Kargo") return `https://kargotakip.mngkargo.com.tr/?takipNo=${encoded}`;
  if (carrier === "UPS") return `https://www.ups.com/track?tracknum=${encoded}`;
  return null;
}

export function turkeyPhoneDigits(phone: string) {
  const digits = phone.replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("90") && digits.length >= 12) return digits;
  if (digits.startsWith("0") && digits.length >= 11) return `90${digits.slice(1)}`;
  if (digits.length === 10 && digits.startsWith("5")) return `90${digits}`;
  return digits;
}

export function telHref(phone: string) {
  const digits = turkeyPhoneDigits(phone);
  return digits ? `tel:+${digits}` : "";
}

export function whatsappHref(phone: string) {
  const digits = turkeyPhoneDigits(phone);
  return digits ? `https://wa.me/${digits}` : "";
}

export const ORDER_ACTION: Record<string, { label: string; confirm?: string }> = {
  PROCESSING: { label: "Hazırlamaya Al" },
  SHIPPED: { label: "Kargoya Ver" },
  DELIVERED: { label: "Teslim Edildi İşaretle" },
  CANCELLED: { label: "Siparişi İptal Et", confirm: "Emin misiniz? Sipariş iptal edilecek ve stok geri eklenecek." },
  RETURNED: { label: "İade Al", confirm: "Emin misiniz? Sipariş iade olarak işaretlenecek ve stok geri eklenecek." },
};

export const PAYMENT_ACTION: Record<string, { label: string; confirm?: string }> = {
  PAID: { label: "Ödendi İşaretle", confirm: "Emin misiniz? Ödeme ödendi olarak işaretlenecek." },
  REFUNDED: { label: "Ödemeyi İade Edildi İşaretle", confirm: "Emin misiniz? Ödeme iade edildi olarak işaretlenecek." },
  PENDING: { label: "Ödeme Bekleniyor İşaretle" },
};

export function paymentMethodLabel(provider?: string, label?: string) {
  if (label && label !== "Tanımsız") return label;
  if (provider === "havale") return "Havale/EFT";
  if (provider === "paytr") return "PayTR";
  if (!provider || provider === "unconfigured") return "—";
  return provider;
}

export type OrderAddress = {
  fullName: string;
  phone: string;
  line1: string;
  line2?: string;
  district: string;
  city: string;
  postalCode: string;
  country: string;
};

export type AdminOrder = {
  id: string;
  number: string;
  email: string;
  customerName: string;
  phone: string;
  status: string;
  statusLabel: string;
  allowedStatuses: string[];
  placedAt: string;
  currency: string;
  subtotalAmount: number;
  discountAmount: number;
  shippingAmount: number;
  taxAmount: number;
  totalAmount: number;
  customerNote: string | null;
  staffNote: string | null;
  shippingAddress: OrderAddress;
  billingAddress: OrderAddress;
  billingSameAsShipping: boolean;
  invoice: {
    collected: boolean;
    type: string;
    typeLabel: string;
    personName: string;
    nationalId: string;
    companyName: string;
    taxOffice: string;
    taxId: string;
    eInvoice: boolean;
    sameAsShipping: boolean;
    issued: boolean;
    number: string;
    date: string;
  };
  itemSummary: string;
  customerOrderCount: number | null;
  items: {
    id: string;
    productId: string | null;
    productName: string;
    variantName: string;
    sku: string;
    quantity: number;
    unitAmount: number;
    totalAmount: number;
    image: { url: string; alt: string } | null;
  }[];
  payment: {
    provider: string;
    providerLabel: string;
    providerRef: string | null;
    status: string;
    statusLabel: string;
    allowedStatuses: string[];
    amount: number;
    currency: string;
    markedManually: boolean;
    updatedAt: string;
  };
  shipment: { carrier: string; trackingNumber: string; status: string; statusLabel: string };
  canUpdate: boolean;
  history: { action: string; text: string; actorName: string; createdAt: string }[];
};

export type OrderListMeta = {
  page: number;
  pageSize: number;
  total: number;
  canUpdate?: boolean;
  counts?: Record<string, number>;
};

export function formatWhen(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(date.getDate())}.${pad(date.getMonth() + 1)}.${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

export function formatAddress(address: OrderAddress) {
  return [address.fullName, address.phone, address.line1, address.line2, `${address.district} / ${address.city}`, address.postalCode]
    .filter((part) => part && part.trim())
    .join("\n");
}

export function blank(value: string | number | null | undefined) {
  if (value === null || value === undefined) return "Bilgi yok";
  const text = String(value).trim();
  return text ? text : "Bilgi yok";
}

export function badgeClass(kind: "order" | "payment" | "shipment", status: string) {
  if (status === "DELIVERED" || status === "PAID") return "order-badge order-badge-ok";
  if (status === "CANCELLED" || status === "FAILED" || status === "RETURNED" || status === "REFUNDED") {
    return "order-badge order-badge-cancel";
  }
  if (kind === "payment") return "order-badge order-badge-pay";
  if (kind === "shipment") return "order-badge order-badge-ship";
  return "order-badge order-badge-order";
}

export function compactAddress(address: OrderAddress) {
  const street = [address.line1, address.line2].filter((part) => part && part.trim()).join(", ");
  const city = [address.district, address.city].filter((part) => part && part.trim()).join(" / ");
  const line = [city, address.postalCode].filter((part) => part && part.trim()).join(" ");
  return [street, line].filter(Boolean).join("\n");
}

export function formatWhenShort(value: string) {
  return formatWhen(value).replace(/^(\d{2}\.\d{2}\.\d{4} \d{2}:\d{2}):\d{2}$/, "$1");
}
