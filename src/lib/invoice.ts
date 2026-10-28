import { TURKEY_DISTRICTS, isTurkeyCityDistrict } from "./turkey-locations";

export function isValidTckn(value: string) {
  if (!/^[1-9]\d{10}$/.test(value)) return false;
  const digits = value.split("").map(Number);
  const odd = digits[0] + digits[2] + digits[4] + digits[6] + digits[8];
  const even = digits[1] + digits[3] + digits[5] + digits[7];
  const tenth = (((odd * 7) - even) % 10 + 10) % 10;
  if (tenth !== digits[9]) return false;
  const eleventh = digits.slice(0, 10).reduce((sum, digit) => sum + digit, 0) % 10;
  return eleventh === digits[10];
}

export type InvoiceType = "INDIVIDUAL" | "CORPORATE";

export type CheckoutInvoiceInput = {
  type: InvoiceType;
  personName: string;
  nationalId: string;
  companyName: string;
  taxOffice: string;
  taxId: string;
  eInvoice: boolean;
  sameAsShipping: boolean;
};

export type CheckoutAddressInput = {
  fullName: string;
  phone: string;
  line1: string;
  district: string;
  city: string;
  postalCode: string;
  country: string;
};

export function validateCheckoutForm(options: {
  email: string;
  shipping: CheckoutAddressInput;
  invoice: CheckoutInvoiceInput;
  billing: CheckoutAddressInput;
  termsAccepted: boolean;
  paymentMethod: "paytr" | "havale" | "";
  canCheckout: boolean;
}) {
  const errors: Record<string, string> = {};
  if (!options.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(options.email.trim())) {
    errors.email = "Geçerli bir e-posta girin.";
  }
  function address(prefix: string, address: CheckoutAddressInput) {
    if (address.fullName.trim().length < 3) errors[`${prefix}.fullName`] = "Ad soyad en az 3 karakter olmalı.";
    if (address.phone.trim().length < 10) errors[`${prefix}.phone`] = "Telefon numarasını kontrol edin.";
    if (address.line1.trim().length < 3) errors[`${prefix}.line1`] = "Adres en az 3 karakter olmalı.";
    if (!TURKEY_DISTRICTS[address.city.trim()]) errors[`${prefix}.city`] = "Geçerli bir il seçin.";
    else if (!isTurkeyCityDistrict(address.city.trim(), address.district.trim())) {
      errors[`${prefix}.district`] = "İlçe, seçilen ile ait değil.";
    }
    if (address.postalCode.trim().length < 4) errors[`${prefix}.postalCode`] = "Posta kodunu kontrol edin.";
  }
  address("shippingAddress", options.shipping);
  const nationalId = options.invoice.nationalId.trim();
  if (nationalId && !isValidTckn(nationalId)) errors["invoice.nationalId"] = "TC kimlik numarası geçersiz.";
  if (!options.invoice.sameAsShipping) {
    if (options.invoice.type === "INDIVIDUAL") {
      if (options.invoice.personName.trim().length < 3) errors["invoice.personName"] = "Fatura için ad soyad girin.";
    } else {
      if (!options.invoice.companyName.trim()) errors["invoice.companyName"] = "Firma unvanı girin.";
      if (!options.invoice.taxOffice.trim()) errors["invoice.taxOffice"] = "Vergi dairesi girin.";
      const taxId = options.invoice.taxId.trim();
      if (!taxId) errors["invoice.taxId"] = "Vergi numarası girin.";
      else if (!/^\d{10}$/.test(taxId)) errors["invoice.taxId"] = "Vergi numarası 10 hane olmalı.";
    }
    address("billingAddress", options.billing);
  }
  if (!options.termsAccepted) errors.termsAccepted = "Sözleşmeleri onaylamanız gerekir.";
  if (!options.canCheckout) errors.paymentMethod = "Şu an tamamlanabilir bir ödeme yöntemi yok.";
  else if (!options.paymentMethod) errors.paymentMethod = "Ödeme yöntemi seçin.";
  return errors;
}
