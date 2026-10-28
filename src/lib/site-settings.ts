export const SOCIAL_KEYS = ["instagram", "facebook", "tiktok", "youtube", "x", "pinterest"] as const;
export type SocialKey = (typeof SOCIAL_KEYS)[number];

export const SOCIAL_LABELS: Record<SocialKey, string> = {
  instagram: "Instagram",
  facebook: "Facebook",
  tiktok: "TikTok",
  youtube: "YouTube",
  x: "X",
  pinterest: "Pinterest",
};

export type PublicSettings = {
  general: { storeName: string; slogan: string; logoUrl: string | null; iconUrl: string | null; configured: boolean };
  company: { legalName: string; taxOffice: string; taxNumber: string; mersisNo: string; tradeRegistryNo: string; kepAddress: string; address: string };
  contact: { email: string; phone: string; whatsapp: string; address: string; workingHours: string; mapUrl: string };
  social: Partial<Record<SocialKey, string>>;
  shipping: { flatFee: number; freeShippingThreshold: number | null; dispatchTime: string; defaultCarrier: string };
  payment: { minOrderAmount: number | null };
  order: { havalePaymentDays: number | null };
  announcement: { enabled: boolean; text: string };
  maintenance: { enabled: boolean };
};

function obj(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function str(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function num(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function normalizeSettings(raw: unknown): PublicSettings {
  const root = obj(raw);
  const general = obj(root.general);
  const company = obj(root.company);
  const contact = obj(root.contact);
  const social = obj(root.social);
  const shipping = obj(root.shipping);
  const announcement = obj(root.announcement);
  return {
    general: {
      storeName: str(general.storeName),
      slogan: str(general.slogan),
      logoUrl: str(general.logoUrl) || null,
      iconUrl: str(general.iconUrl) || null,
      configured: general.configured === true,
    },
    company: {
      legalName: str(company.legalName),
      taxOffice: str(company.taxOffice),
      taxNumber: str(company.taxNumber),
      mersisNo: str(company.mersisNo),
      tradeRegistryNo: str(company.tradeRegistryNo),
      kepAddress: str(company.kepAddress),
      address: str(company.address),
    },
    contact: {
      email: str(contact.email),
      phone: str(contact.phone),
      whatsapp: str(contact.whatsapp),
      address: str(contact.address),
      workingHours: str(contact.workingHours),
      mapUrl: str(contact.mapUrl),
    },
    social: Object.fromEntries(SOCIAL_KEYS.map((key) => [key, str(social[key])]).filter(([, value]) => value)),
    shipping: {
      flatFee: num(shipping.flatFee) ?? 0,
      freeShippingThreshold: num(shipping.freeShippingThreshold),
      dispatchTime: str(shipping.dispatchTime),
      defaultCarrier: str(shipping.defaultCarrier),
    },
    payment: { minOrderAmount: num(obj(root.payment).minOrderAmount) },
    order: { havalePaymentDays: num(obj(root.order).havalePaymentDays) },
    announcement: { enabled: announcement.enabled === true, text: str(announcement.text) },
    maintenance: { enabled: obj(root.maintenance).enabled === true },
  };
}

export const EMPTY_SETTINGS = normalizeSettings({});

/** "1–2 iş günü" → "1–2 iş gününde kargoda"; free text falls back to "… içinde kargoda". */
export function dispatchPhrase(value: string) {
  const text = value.trim();
  if (!text) return "";
  if (/^aynı gün$/i.test(text)) return "Aynı gün kargoda";
  if (/iş günü$/i.test(text)) return text.replace(/iş günü$/i, "iş gününde kargoda");
  return `${text} içinde kargoda`;
}

/** Turkish phone input to an international `tel:` / WhatsApp number (digits only, 90 prefix). */
export function phoneToInternational(value: string) {
  const digits = value.replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("90") && digits.length === 12) return digits;
  if (digits.startsWith("0") && digits.length === 11) return `9${digits}`;
  if (digits.length === 10) return `90${digits}`;
  return digits;
}

export function telLink(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.length === 7 && digits.startsWith("444")) return `tel:${digits}`;
  const intl = phoneToInternational(value);
  return intl ? `tel:+${intl}` : "";
}

export function whatsappLink(value: string) {
  const intl = phoneToInternational(value);
  return intl ? `https://wa.me/${intl}` : "";
}
