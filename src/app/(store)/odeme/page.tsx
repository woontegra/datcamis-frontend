"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCart } from "@/components/store/cart-context";
import { useCustomer } from "@/components/store/customer-context";
import { ApiError, browserApi, customerMessage } from "@/lib/api";
import { addressLines, type SavedAddress } from "@/lib/account";
import { productPhotoSlot } from "@/lib/home-visual";
import { validateCheckoutForm, type InvoiceType } from "@/lib/invoice";
import { formatTry } from "@/lib/money";
import { PROVINCE_NAMES, districtsOf } from "@/lib/turkey-locations";
import { AddressFields } from "@/components/store/AddressFields";
import { PlaceSelect } from "@/components/store/PlaceSelect";
import { ShippingHint, shippingLabel } from "@/components/store/ShippingHint";

type PaymentConfig = {
  card: { enabled: boolean; message: string };
  havale: { enabled: boolean };
  canCheckout: boolean;
  noneMessage: string;
};
type CheckoutResult = {
  order: { id?: string; number: string; accessToken?: string; totalAmount: number };
  payment: {
    provider: string;
    iframeToken?: string;
    iframeUrl?: string;
    bankName?: string;
    accountHolder?: string;
    iban?: string;
    note?: string;
  };
};

const emptyAddress = { fullName: "", phone: "", line1: "", district: "", city: "", postalCode: "", country: "TR" };

function FieldError({ message }: { message?: string }) {
  return <span className="field-error">{message || "\u00a0"}</span>;
}

function fromSaved(address: SavedAddress) {
  return {
    fullName: address.fullName,
    phone: address.phone,
    line1: [address.line1, address.line2].filter((part) => part && part.trim()).join(", "),
    district: address.district,
    city: address.city,
    postalCode: address.postalCode,
    country: "TR",
  };
}

export default function CheckoutPage() {
  const router = useRouter();
  const { cart, refresh } = useCart();
  const { customer, ready: customerReady } = useCustomer();
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);
  const [addressChoice, setAddressChoice] = useState<string>("new");
  const [saveAddress, setSaveAddress] = useState(false);
  const [config, setConfig] = useState<PaymentConfig | null>(null);
  const [message, setMessage] = useState("");
  const [iframeUrl, setIframeUrl] = useState("");
  const [orderNumber, setOrderNumber] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [email, setEmail] = useState("");
  const [shipping, setShipping] = useState(emptyAddress);
  const [billing, setBilling] = useState(emptyAddress);
  const [invoiceType, setInvoiceType] = useState<InvoiceType>("INDIVIDUAL");
  const [personName, setPersonName] = useState("");
  const [nationalId, setNationalId] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [taxOffice, setTaxOffice] = useState("");
  const [taxId, setTaxId] = useState("");
  const [eInvoice, setEInvoice] = useState(false);
  const [customInvoice, setCustomInvoice] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"paytr" | "havale" | "">("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [summaryOpen, setSummaryOpen] = useState(false);

  useEffect(() => {
    void browserApi<{ data: PaymentConfig }>("/checkout/payment-config", { cache: "no-store" })
      .then((body) => {
        setConfig(body.data);
        if (body.data.havale.enabled) setPaymentMethod("havale");
        else if (body.data.card.enabled) setPaymentMethod("paytr");
        else setPaymentMethod("");
      })
      .catch(() => setConfig({
        card: { enabled: false, message: "Yakında aktif olacak" },
        havale: { enabled: false },
        canCheckout: false,
        noneMessage: "Şu an tamamlanabilir bir ödeme yöntemi yok.",
      }));
  }, []);

  useEffect(() => {
    if (!customerReady || !customer) return;
    let cancelled = false;
    browserApi<{ data: SavedAddress[] }>("/account/addresses", { cache: "no-store" })
      .then((body) => body.data)
      .catch(() => [] as SavedAddress[])
      .then((list) => {
        if (cancelled) return;
        setEmail(customer.email);
        setSavedAddresses(list);
        const preferred = list.find((item) => item.isDefault) ?? list[0];
        if (preferred) {
          setAddressChoice(preferred.id);
          setShipping(fromSaved(preferred));
          return;
        }
        setShipping((current) => ({
          ...current,
          fullName: current.fullName.trim() || `${customer.firstName} ${customer.lastName}`.trim(),
          phone: current.phone.trim() || customer.phone,
        }));
      });
    return () => {
      cancelled = true;
    };
  }, [customer, customerReady]);

  function chooseAddress(choice: string) {
    setAddressChoice(choice);
    const saved = savedAddresses.find((item) => item.id === choice);
    if (saved) setShipping(fromSaved(saved));
    else setShipping({
      ...emptyAddress,
      fullName: customer ? `${customer.firstName} ${customer.lastName}`.trim() : "",
      phone: customer?.phone ?? "",
    });
  }

  const usingSaved = addressChoice !== "new" && savedAddresses.some((item) => item.id === addressChoice);
  const savedHasError = usingSaved && Object.keys(errors).some((key) => key.startsWith("shippingAddress."));

  function setBill<K extends keyof typeof emptyAddress>(key: K, value: string) {
    setBilling((current) => ({ ...current, [key]: value }));
  }

  const subtotal = cart?.subtotalAmount || 0;
  const total = cart?.totalAmount ?? subtotal;
  const minOrderMessage = cart?.minOrderMessage || "";
  const canCheckout = Boolean(config?.canCheckout) && !minOrderMessage;

  async function submit() {
    if (minOrderMessage) {
      setMessage(minOrderMessage);
      return;
    }
    const sameAsShipping = !customInvoice;
    const type = customInvoice ? invoiceType : "INDIVIDUAL";
    const billingToSend = {
      ...billing,
      fullName: billing.fullName.trim() || (type === "INDIVIDUAL" ? personName.trim() : shipping.fullName.trim()) || shipping.fullName,
      phone: billing.phone.trim() || shipping.phone,
    };
    const invoice = {
      type,
      personName: customInvoice && type === "INDIVIDUAL" ? personName : shipping.fullName,
      nationalId,
      companyName: customInvoice && type === "CORPORATE" ? companyName : "",
      taxOffice: customInvoice && type === "CORPORATE" ? taxOffice : "",
      taxId: customInvoice && type === "CORPORATE" ? taxId : "",
      eInvoice: customInvoice && type === "CORPORATE" ? eInvoice : false,
      sameAsShipping,
    };
    const nextErrors = validateCheckoutForm({
      email,
      shipping,
      invoice,
      billing: billingToSend,
      termsAccepted,
      paymentMethod,
      canCheckout,
    });
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      setMessage("");
      return;
    }
    setMessage("");
    try {
      const token = localStorage.getItem("dm_cart_token");
      const result = await browserApi<{ data: CheckoutResult }>("/checkout", {
        method: "POST",
        headers: { "x-cart-token": token || "" },
        body: JSON.stringify({
          email,
          shippingAddress: shipping,
          invoice: {
            type,
            personName: type === "INDIVIDUAL" ? (sameAsShipping ? shipping.fullName.trim() : personName.trim()) : undefined,
            nationalId: nationalId.trim() || undefined,
            companyName: type === "CORPORATE" ? companyName.trim() : undefined,
            taxOffice: type === "CORPORATE" ? taxOffice.trim() : undefined,
            taxId: type === "CORPORATE" ? taxId.trim() : undefined,
            eInvoice: type === "CORPORATE" ? eInvoice : undefined,
            sameAsShipping,
          },
          billingAddress: sameAsShipping ? undefined : billingToSend,
          paymentMethod,
          termsAccepted: true,
          saveAddress: customer && !usingSaved ? saveAddress : undefined,
        }),
      });
      await refresh();
      if (result.data.payment.provider === "havale") {
        const accessToken = result.data.order.accessToken;
        if (!accessToken) {
          setMessage("Sipariş alındı ancak teşekkür sayfası açılamadı.");
          return;
        }
        router.push(`/odeme/tesekkur?k=${encodeURIComponent(accessToken)}`);
        return;
      }
      setOrderNumber(result.data.order.number);
      setIframeUrl(result.data.payment.iframeUrl || "");
    } catch (error) {
      if (error instanceof ApiError && error.details?.length) {
        setErrors(Object.fromEntries(error.details.map((item) => [item.path, item.message])));
        setMessage(error.message);
      } else {
        setMessage(customerMessage(error, "Sipariş oluşmadı."));
      }
    }
  }

  const summary = (
    <>
      <ul className="summary-items">
        {cart?.items.map((item) => (
          <li key={item.id}>
            <img src={item.image?.url || productPhotoSlot(item.productSlug)} alt="" />
            <div>
              <p>{item.productName}</p>
              <p>{item.variantName} × {item.quantity}</p>
            </div>
            <span>{formatTry(item.lineAmount)}</span>
          </li>
        ))}
      </ul>
      <div className="summary-row"><span>Ara toplam</span><span>{formatTry(subtotal)}</span></div>
      <div className="summary-row"><span>Kargo</span><span>{shippingLabel(cart?.shippingAmount)}</span></div>
      <div className="summary-row is-total"><span>Toplam</span><span>{formatTry(total)}</span></div>
      {cart ? <ShippingHint cart={cart} /> : null}
      {minOrderMessage ? (
        <p className="summary-note is-warning" role="alert">
          {minOrderMessage} <Link href="/urunler">Ürünlere dön</Link>
        </p>
      ) : null}
      <label className="field-check terms-check">
        <input type="checkbox" checked={termsAccepted} onChange={(event) => setTermsAccepted(event.target.checked)} />
        <span>
          <a href="/sayfa/on-bilgilendirme-formu" target="_blank" rel="noopener noreferrer">Ön Bilgilendirme Formu</a>
          ’nu ve{" "}
          <a href="/sayfa/mesafeli-satis-sozlesmesi" target="_blank" rel="noopener noreferrer">Mesafeli Satış Sözleşmesi</a>
          ’ni okudum, onaylıyorum.
        </span>
      </label>
      <FieldError message={errors.termsAccepted} />
      <button className="green-btn checkout-submit-desktop" type="button" disabled={!canCheckout} onClick={() => void submit()}>
        Siparişi tamamla
      </button>
      <p className="secure-note">Güvenli ödeme</p>
      {!config?.canCheckout && config ? <p className="error">{config.noneMessage}</p> : null}
      {message ? <p className="error">{message}</p> : null}
    </>
  );

  return (
    <div className="wrap section checkout-page">
      <p className="eyebrow">Ödeme</p>
      {iframeUrl ? (
        <div className="paytr-frame-wrap">
          <p>Sipariş no: {orderNumber}. Kart bilgilerini yalnızca aşağıdaki PayTR ekranına girin.</p>
          <iframe className="paytr-frame" src={iframeUrl} title="PayTR ödeme ekranı" />
        </div>
      ) : (
        <>
          <ol className="checkout-steps">
            <li>1 Teslimat</li>
            {customInvoice ? <li>2 Fatura</li> : null}
            <li>{customInvoice ? "3" : "2"} Ödeme</li>
          </ol>
          <div className="checkout-layout">
            <form className="checkout-form" noValidate onSubmit={(event) => { event.preventDefault(); void submit(); }}>
              <button className="summary-toggle" type="button" onClick={() => setSummaryOpen((open) => !open)}>
                Sipariş özetini {summaryOpen ? "gizle" : "göster"} ({formatTry(total)})
              </button>
              {summaryOpen ? <div className="order-summary is-mobile">{summary}</div> : null}

              <section className="checkout-block">
                <h2>1. İletişim ve teslimat</h2>
                {customerReady && !customer ? (
                  <p className="checkout-login-hint">
                    Hesabınız var mı? <Link href="/giris?next=%2Fodeme">Giriş yapın</Link>; bilgileriniz otomatik dolsun.
                  </p>
                ) : null}
                {customer && savedAddresses.length ? (
                  <div className="saved-addresses" role="radiogroup" aria-label="Teslimat adresi">
                    {savedAddresses.map((item) => (
                      <label key={item.id} className={`pay-method ${addressChoice === item.id ? "is-on" : ""}`}>
                        <input type="radio" name="savedAddress" checked={addressChoice === item.id} onChange={() => chooseAddress(item.id)} />
                        <span>
                          <strong>{item.fullName}{item.isDefault ? " · Varsayılan" : ""}</strong>
                          <small>{addressLines(item).slice(1).join(" · ")}</small>
                        </span>
                      </label>
                    ))}
                    <label className={`pay-method ${addressChoice === "new" ? "is-on" : ""}`}>
                      <input type="radio" name="savedAddress" checked={addressChoice === "new"} onChange={() => chooseAddress("new")} />
                      <span><strong>Yeni adres</strong></span>
                    </label>
                  </div>
                ) : null}
                {usingSaved ? (
                  <div className="form-grid two">
                    <label className="field">E-posta
                      <input name="email" type="email" value={email} readOnly />
                      <FieldError message={errors.email} />
                    </label>
                    <label className="field">TC kimlik no (isteğe bağlı)
                      <input type="tel" inputMode="numeric" pattern="[0-9]*" autoComplete="off" maxLength={11} value={nationalId} onChange={(event) => setNationalId(event.target.value.replace(/\D/g, "").slice(0, 11))} />
                      <FieldError message={errors["invoice.nationalId"]} />
                    </label>
                    {savedHasError ? <p className="error span-2">Seçili adreste eksik bilgi var. Adreslerim sayfasından düzenleyin veya yeni adres girin.</p> : null}
                  </div>
                ) : (
                  <AddressFields
                    value={shipping}
                    onChange={setShipping}
                    errors={errors}
                    errorPrefix="shippingAddress"
                    afterName={(
                      <label className="field">E-posta
                        <input name="email" type="email" autoComplete="email" value={email} readOnly={Boolean(customer)} onChange={(event) => setEmail(event.target.value)} />
                        <FieldError message={errors.email} />
                      </label>
                    )}
                  >
                    <label className="field">TC kimlik no (isteğe bağlı)
                      <input type="tel" inputMode="numeric" pattern="[0-9]*" autoComplete="off" maxLength={11} value={nationalId} onChange={(event) => setNationalId(event.target.value.replace(/\D/g, "").slice(0, 11))} />
                      <FieldError message={errors["invoice.nationalId"]} />
                    </label>
                    {customer ? (
                      <label className="field-check span-2">
                        <input type="checkbox" checked={saveAddress} onChange={(event) => setSaveAddress(event.target.checked)} />
                        Bu adresi kaydet
                      </label>
                    ) : null}
                  </AddressFields>
                )}
              </section>

              <label className="field-check checkout-invoice-toggle">
                <input
                  type="checkbox"
                  checked={customInvoice}
                  onChange={(event) => {
                    const checked = event.target.checked;
                    setCustomInvoice(checked);
                    if (checked) {
                      setPersonName((current) => current.trim() || shipping.fullName);
                      setBilling((current) => (current.line1.trim() ? current : { ...shipping }));
                    }
                  }}
                />
                Kurumsal fatura veya farklı fatura adresi istiyorum
              </label>

              {customInvoice ? (
              <section className="checkout-block">
                <h2>2. Fatura bilgileri</h2>
                <div className="type-toggle">
                  <button type="button" className={invoiceType === "INDIVIDUAL" ? "is-on" : ""} onClick={() => setInvoiceType("INDIVIDUAL")}>Bireysel</button>
                  <button type="button" className={invoiceType === "CORPORATE" ? "is-on" : ""} onClick={() => setInvoiceType("CORPORATE")}>Kurumsal</button>
                </div>
                {invoiceType === "INDIVIDUAL" ? (
                  <div className="form-grid two">
                    <label className="field span-2">Ad soyad
                      <input value={personName} onChange={(event) => setPersonName(event.target.value)} autoComplete="name" />
                      <FieldError message={errors["invoice.personName"]} />
                    </label>
                  </div>
                ) : (
                  <div className="form-grid two">
                    <label className="field">Firma unvanı
                      <input value={companyName} onChange={(event) => setCompanyName(event.target.value)} />
                      <FieldError message={errors["invoice.companyName"]} />
                    </label>
                    <label className="field">Vergi dairesi
                      <input value={taxOffice} onChange={(event) => setTaxOffice(event.target.value)} />
                      <FieldError message={errors["invoice.taxOffice"]} />
                    </label>
                    <label className="field">Vergi numarası
                      <input type="tel" inputMode="numeric" pattern="[0-9]*" autoComplete="off" maxLength={10} value={taxId} onChange={(event) => setTaxId(event.target.value.replace(/\D/g, "").slice(0, 10))} />
                      <FieldError message={errors["invoice.taxId"]} />
                    </label>
                    <label className="field-check">
                      <input type="checkbox" checked={eInvoice} onChange={(event) => setEInvoice(event.target.checked)} />
                      e-Fatura mükellefiyim
                    </label>
                  </div>
                )}
                <div className="form-grid two">
                  <label className="field span-2">Adres
                    <input value={billing.line1} onChange={(event) => setBill("line1", event.target.value)} />
                    <FieldError message={errors["billingAddress.line1"]} />
                  </label>
                  <PlaceSelect
                    label="İl"
                    value={billing.city}
                    options={PROVINCE_NAMES}
                    placeholder="İl seçin"
                    error={errors["billingAddress.city"]}
                    onChange={(city) => setBilling((current) => ({ ...current, city, district: city === current.city ? current.district : "" }))}
                  />
                  <PlaceSelect
                    label="İlçe"
                    value={billing.district}
                    options={districtsOf(billing.city)}
                    disabled={!billing.city}
                    placeholder={billing.city ? "İlçe seçin" : "Önce il seçin"}
                    error={errors["billingAddress.district"]}
                    onChange={(district) => setBill("district", district)}
                  />
                  <label className="field">Posta kodu
                    <input inputMode="numeric" value={billing.postalCode} onChange={(event) => setBill("postalCode", event.target.value)} />
                    <FieldError message={errors["billingAddress.postalCode"]} />
                  </label>
                </div>
              </section>
              ) : null}

              <section className="checkout-block">
                <h2>{customInvoice ? "3. Ödeme yöntemi" : "2. Ödeme yöntemi"}</h2>
                {config?.havale.enabled ? (
                  <label className={`pay-method ${paymentMethod === "havale" ? "is-on" : ""}`}>
                    <input type="radio" name="pay" checked={paymentMethod === "havale"} onChange={() => setPaymentMethod("havale")} />
                    <span>
                      <strong>Havale / EFT</strong>
                      <small>Sipariş sonrası IBAN gösterilir. Açıklamaya sipariş numaranızı yazın.</small>
                    </span>
                  </label>
                ) : null}
                <label className={`pay-method ${paymentMethod === "paytr" ? "is-on" : ""} ${config?.card.enabled ? "" : "is-disabled"}`}>
                  <input
                    type="radio"
                    name="pay"
                    checked={paymentMethod === "paytr"}
                    disabled={!config?.card.enabled}
                    onChange={() => setPaymentMethod("paytr")}
                  />
                  <span>
                    <strong>Kredi / banka kartı</strong>
                    <small>{config?.card.enabled ? config.card.message : "Yakında aktif olacak"}</small>
                  </span>
                </label>
                <FieldError message={errors.paymentMethod} />
              </section>
              {minOrderMessage ? (
                <p className="summary-note is-warning checkout-submit-mobile" role="alert">
                  {minOrderMessage} <Link href="/urunler">Ürünlere dön</Link>
                </p>
              ) : null}
              <button className="green-btn checkout-submit-mobile" type="submit" disabled={!canCheckout}>Siparişi tamamla</button>
            </form>
            <aside className="order-summary is-desktop">
              <h2>Sipariş özeti</h2>
              {summary}
            </aside>
          </div>
        </>
      )}
    </div>
  );
}
