export type Customer = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  marketingOptIn: boolean;
  createdAt: string;
};

export type SavedAddress = {
  id: string;
  fullName: string;
  phone: string;
  line1: string;
  line2: string;
  district: string;
  city: string;
  postalCode: string;
  country: string;
  isDefault: boolean;
};

export type AccountOrderStatus = { key: string; label: string };

export type AccountOrderSummary = {
  id: string;
  number: string;
  placedAt: string;
  status: AccountOrderStatus;
  itemCount: number;
  totalAmount: number;
  currency: string;
  images: Array<{ url: string; alt: string } | null>;
  awaitingHavale: boolean;
  shipment: { carrier: string; trackingNumber: string; inTransit: boolean };
};

export type AccountOrderAddress = {
  fullName: string;
  phone: string;
  line1: string;
  line2: string;
  district: string;
  city: string;
  postalCode: string;
};

export type AccountOrderDetail = AccountOrderSummary & {
  timeline: Array<{ key: string; label: string; done: boolean; at: string | null }>;
  paymentMethod: string;
  subtotalAmount: number;
  discountAmount: number;
  shippingAmount: number;
  items: Array<{
    id: string;
    productName: string;
    variantName: string;
    quantity: number;
    unitAmount: number;
    totalAmount: number;
    image: { url: string; alt: string } | null;
  }>;
  shippingAddress: AccountOrderAddress;
  invoice: {
    type: string;
    typeLabel: string;
    personName: string;
    companyName: string;
    taxOffice: string;
    taxId: string;
    nationalId: string;
    sameAsShipping: boolean;
    address: AccountOrderAddress;
  };
  havale: { bankName: string; accountHolder: string; iban: string; paymentDueDays?: number | null } | null;
};

export function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(date.getDate())}.${pad(date.getMonth() + 1)}.${date.getFullYear()}`;
}

export function safeNext(value: string | undefined | null, fallback = "/hesap") {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.startsWith("/admin")) return fallback;
  if (/[\\\u0000-\u001f]/.test(value)) return fallback;
  return value;
}

export function addressLines(address: AccountOrderAddress | SavedAddress) {
  return [
    address.fullName,
    [address.line1, address.line2].filter(Boolean).join(", "),
    [[address.district, address.city].filter(Boolean).join(" / "), address.postalCode].filter(Boolean).join(" "),
    address.phone,
  ].filter((line) => line && line.trim());
}
