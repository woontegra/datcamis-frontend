import { formatTry } from "./money";

export type StoreSettings = {
  general: { storeName: string; slogan: string; logoMediaId: string; iconMediaId: string };
  company: { legalName: string; taxOffice: string; taxNumber: string; mersisNo: string; tradeRegistryNo: string; kepAddress: string; address: string };
  contact: { email: string; phone: string; whatsapp: string; address: string; workingHours: string; mapUrl: string };
  social: { instagram: string; facebook: string; tiktok: string; youtube: string; x: string; pinterest: string };
  shipping: { flatFee: number; freeShippingEnabled: boolean; freeShippingThreshold: number | null; defaultCarrier: string; dispatchTime: string };
  payment: { minOrderAmount: number | null };
  order: { numberPrefix: string; havalePaymentDays: number | null };
  announcement: { enabled: boolean; text: string };
  maintenance: { enabled: boolean };
  havale: { enabled: boolean; bankName: string; accountHolder: string; iban: string; note: string };
};

export type SettingsInfo = { paytrConfigured: boolean; carriers: string[]; savedSections: string[] };

export type Section = keyof StoreSettings;

/** Same as StoreSettings, except amounts and day counts are kept as the text the admin typed. */
export type Draft = Omit<StoreSettings, "shipping" | "payment" | "order"> & {
  shipping: Omit<StoreSettings["shipping"], "flatFee" | "freeShippingThreshold"> & { flatFee: string; freeShippingThreshold: string };
  payment: { minOrderAmount: string };
  order: { numberPrefix: string; havalePaymentDays: string };
};

export type TabKey = "genel" | "firma" | "iletisim" | "sosyal" | "kargo" | "odeme" | "siparis" | "duyuru";

export const TABS: Array<{ key: TabKey; label: string; sections: Section[] }> = [
  { key: "genel", label: "Genel", sections: ["general"] },
  { key: "firma", label: "Firma bilgileri", sections: ["company"] },
  { key: "iletisim", label: "İletişim", sections: ["contact"] },
  { key: "sosyal", label: "Sosyal medya", sections: ["social"] },
  { key: "kargo", label: "Kargo", sections: ["shipping"] },
  { key: "odeme", label: "Ödeme", sections: ["havale", "payment"] },
  { key: "siparis", label: "Sipariş", sections: ["order"] },
  { key: "duyuru", label: "Duyuru ve bakım", sections: ["announcement", "maintenance"] },
];

export function tabOfSection(section: string) {
  return TABS.find((tab) => (tab.sections as string[]).includes(section))?.key;
}

export function moneyText(amount: number | null) {
  if (amount === null) return "";
  return formatTry(amount).replace(/ TL$/, "");
}

/** Accepts 75 · 75,5 · 75.50 · 1.250,00 · 1250 and returns kuruş, or null when the text is not an amount. */
export function parseMoney(value: string): number | null {
  let text = value.replace(/tl|₺|\s/gi, "");
  if (!text) return null;
  if (text.includes(",") && text.includes(".")) text = text.replace(/\./g, "").replace(",", ".");
  else if (text.includes(",")) text = text.replace(",", ".");
  else if (/^\d{1,3}(\.\d{3})+$/.test(text)) text = text.replace(/\./g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(text)) return null;
  return Math.round(Number(text) * 100);
}

export function toDraft(settings: StoreSettings): Draft {
  return {
    ...settings,
    shipping: {
      ...settings.shipping,
      flatFee: moneyText(settings.shipping.flatFee),
      freeShippingThreshold: moneyText(settings.shipping.freeShippingThreshold),
    },
    payment: { minOrderAmount: moneyText(settings.payment.minOrderAmount) },
    order: {
      numberPrefix: settings.order.numberPrefix,
      havalePaymentDays: settings.order.havalePaymentDays === null ? "" : String(settings.order.havalePaymentDays),
    },
  };
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function isPhone(value: string) {
  const digits = value.replace(/[\s().-]/g, "");
  return /^444\d{4}$/.test(digits) || /^(\+90|90|0)?[2-5]\d{9}$/.test(digits);
}

function withScheme(value: string) {
  if (!value || /^[a-z][a-z0-9+.-]*:/i.test(value)) return value;
  return /^[^\s/]+\.[^\s/]+/.test(value) ? `https://${value}` : value;
}

function isHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return (url.protocol === "https:" || url.protocol === "http:") && url.hostname.includes(".");
  } catch {
    return false;
  }
}

export function isValidTrIban(value: string) {
  const iban = value.replace(/\s+/g, "").toUpperCase();
  if (!/^TR\d{24}$/.test(iban)) return false;
  const rearranged = `${iban.slice(4)}${iban.slice(0, 4)}`.replace(/[A-Z]/g, (char) => String(char.charCodeAt(0) - 55));
  let remainder = 0;
  for (const digit of rearranged) remainder = (remainder * 10 + Number(digit)) % 97;
  return remainder === 1;
}

type Errors = Record<string, string>;

/** Mirrors the backend rules so most mistakes are caught before saving; the backend still decides. */
export function draftToPayload(draft: Draft, sections: Section[]) {
  const errors: Errors = {};
  const payload: Partial<StoreSettings> = {};
  const set = (path: string, message: string) => {
    if (!errors[path]) errors[path] = message;
  };

  for (const section of sections) {
    if (section === "general") {
      const value = draft.general;
      if (value.storeName.trim().length < 2) set("general.storeName", "Mağaza adı girin.");
      payload.general = { ...value, storeName: value.storeName.trim(), slogan: value.slogan.trim() };
    }
    if (section === "company") {
      const value = draft.company;
      if (value.taxNumber && !/^\d{10}$/.test(value.taxNumber.trim())) set("company.taxNumber", "Vergi no 10 haneli olmalı.");
      if (value.mersisNo && !/^\d{16}$/.test(value.mersisNo.trim())) set("company.mersisNo", "MERSİS no 16 haneli olmalı.");
      if (value.kepAddress && !EMAIL_RE.test(value.kepAddress.trim())) set("company.kepAddress", "Geçerli bir KEP adresi girin.");
      payload.company = value;
    }
    if (section === "contact") {
      const value = { ...draft.contact, mapUrl: withScheme(draft.contact.mapUrl.trim()) };
      if (value.email && !EMAIL_RE.test(value.email.trim())) set("contact.email", "Geçerli bir e-posta girin.");
      if (value.phone && !isPhone(value.phone)) set("contact.phone", "Telefon geçersiz. Örnek: 0532 123 45 67");
      if (value.whatsapp && !isPhone(value.whatsapp)) set("contact.whatsapp", "WhatsApp numarası geçersiz. Örnek: 0532 123 45 67");
      if (value.mapUrl && !isHttpUrl(value.mapUrl)) set("contact.mapUrl", "Harita bağlantısı geçerli bir bağlantı olmalı (https://…).");
      payload.contact = value;
    }
    if (section === "social") {
      const value = Object.fromEntries(Object.entries(draft.social).map(([key, url]) => [key, withScheme(url.trim())])) as StoreSettings["social"];
      for (const [key, url] of Object.entries(value)) {
        if (url && !isHttpUrl(url)) set(`social.${key}`, "Geçerli bir bağlantı girin (https://…).");
      }
      payload.social = value;
    }
    if (section === "shipping") {
      const value = draft.shipping;
      const flatFee = parseMoney(value.flatFee || "0");
      const threshold = value.freeShippingThreshold.trim() ? parseMoney(value.freeShippingThreshold) : null;
      if (flatFee === null) set("shipping.flatFee", "Geçerli bir tutar girin. Örnek: 75,00");
      if (value.freeShippingThreshold.trim() && threshold === null) set("shipping.freeShippingThreshold", "Geçerli bir tutar girin. Örnek: 750,00");
      if (value.freeShippingEnabled && !threshold) set("shipping.freeShippingThreshold", "Ücretsiz kargo sınırını girin.");
      payload.shipping = { ...value, flatFee: flatFee ?? 0, freeShippingThreshold: threshold };
    }
    if (section === "payment") {
      const text = draft.payment.minOrderAmount.trim();
      const amount = text ? parseMoney(text) : null;
      if (text && amount === null) set("payment.minOrderAmount", "Geçerli bir tutar girin. Örnek: 150,00");
      payload.payment = { minOrderAmount: amount };
    }
    if (section === "order") {
      const prefix = draft.order.numberPrefix.trim().toUpperCase();
      if (!/^[A-Z0-9-]{0,10}$/.test(prefix)) set("order.numberPrefix", "Önek en fazla 10 karakter; yalnızca harf (A-Z), rakam ve tire.");
      const daysText = draft.order.havalePaymentDays.trim();
      const days = daysText ? Number(daysText) : null;
      if (days !== null && (!Number.isInteger(days) || days < 1 || days > 30)) set("order.havalePaymentDays", "1 ile 30 arasında bir gün sayısı girin.");
      payload.order = { numberPrefix: prefix, havalePaymentDays: days };
    }
    if (section === "announcement") {
      if (draft.announcement.enabled && !draft.announcement.text.trim()) set("announcement.text", "Duyuru metni girin.");
      payload.announcement = { ...draft.announcement, text: draft.announcement.text.trim() };
    }
    if (section === "maintenance") payload.maintenance = draft.maintenance;
    if (section === "havale") {
      const value = { ...draft.havale, iban: draft.havale.iban.replace(/\s+/g, "").toUpperCase() };
      if (value.enabled) {
        if (value.bankName.trim().length < 2) set("havale.bankName", "Banka adı girin.");
        if (value.accountHolder.trim().length < 3) set("havale.accountHolder", "Hesap sahibi girin.");
        if (!value.iban) set("havale.iban", "IBAN girin.");
      }
      if (value.iban && !/^TR\d{24}$/.test(value.iban)) set("havale.iban", "IBAN TR ve 26 karakter olmalı.");
      else if (value.iban && !isValidTrIban(value.iban)) set("havale.iban", "IBAN kontrol hanesi geçersiz.");
      payload.havale = value;
    }
  }
  return { payload, errors };
}

/** Example baskets for the "Müşteri böyle görecek" card: one below and one above the free-shipping limit. */
export function shippingExamples(flatFee: number, threshold: number | null) {
  const base = threshold ?? 80000;
  const below = Math.max(500, Math.round((base * 0.42) / 500) * 500);
  const above = Math.round((base * 1.0933) / 1000) * 1000;
  return [below, above].map((basket) => {
    const free = threshold !== null && basket >= threshold;
    return { basket, shipping: free ? 0 : flatFee, remaining: threshold !== null && !free && flatFee > 0 ? threshold - basket : null };
  });
}
