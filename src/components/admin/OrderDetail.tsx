"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { browserApi } from "@/lib/api";
import { formatTry } from "@/lib/money";
import {
  badgeClass,
  blank,
  CANCEL_REASONS,
  CARGO_CARRIERS,
  cargoTrackUrl,
  compactAddress,
  formatAddress,
  formatWhen,
  formatWhenShort,
  ORDER_ACTION,
  PAYMENT_ACTION,
  paymentMethodLabel,
  telHref,
  whatsappHref,
  type AdminOrder,
} from "@/lib/orders";

function addressFilled(address: AdminOrder["shippingAddress"] | undefined) {
  if (!address) return false;
  return Boolean(address.line1 || address.city || address.fullName);
}

function isListedCarrier(value: string) {
  return (CARGO_CARRIERS as readonly string[]).includes(value);
}

function formatInvoiceDate(value: string) {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return value;
  return `${match[3]}.${match[2]}.${match[1]}`;
}

const HEADER_ACTION: Record<string, string> = {
  PROCESSING: "Hazırlamaya al",
  SHIPPED: "Kargoya ver",
  DELIVERED: "Teslim edildi",
  RETURNED: "İade al",
};

export function OrderDetail({ order: initial, defaultCarrier = "" }: { order: AdminOrder; defaultCarrier?: string }) {
  const router = useRouter();
  const [order, setOrder] = useState(initial);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [staffNote, setStaffNote] = useState(initial.staffNote ?? "");
  const [carrier, setCarrier] = useState(initial.shipment?.carrier || (isListedCarrier(defaultCarrier) ? defaultCarrier : ""));
  const [carrierOther, setCarrierOther] = useState(() => Boolean(initial.shipment?.carrier && !isListedCarrier(initial.shipment.carrier)));
  const [trackingNumber, setTrackingNumber] = useState(initial.shipment?.trackingNumber ?? "");
  const [copied, setCopied] = useState("");
  const [noteStatus, setNoteStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState<(typeof CANCEL_REASONS)[number] | "">("");
  const [cancelNote, setCancelNote] = useState("");
  const [cancelError, setCancelError] = useState("");
  const [invoiceIssued, setInvoiceIssued] = useState(initial.invoice?.issued ?? false);
  const [invoiceNumber, setInvoiceNumber] = useState(initial.invoice?.number ?? "");
  const [invoiceDate, setInvoiceDate] = useState(initial.invoice?.date ?? "");
  const [invoiceEdit, setInvoiceEdit] = useState(!(initial.invoice?.issued ?? false));

  const invoice = order.invoice ?? {
    collected: false,
    type: "",
    typeLabel: "",
    personName: "",
    nationalId: "",
    companyName: "",
    taxOffice: "",
    taxId: "",
    eInvoice: false,
    sameAsShipping: false,
    issued: false,
    number: "",
    date: "",
  };
  const otherCount = order.customerOrderCount;
  const nextStatus = order.allowedStatuses.find((status) => status !== "CANCELLED" && status !== "RETURNED");
  const canCancel = order.canUpdate && order.allowedStatuses.includes("CANCELLED");
  const paidAction = order.canUpdate ? order.payment.allowedStatuses.find((status) => status === "PAID") : undefined;
  const refundAction = order.canUpdate ? order.payment.allowedStatuses.find((status) => status === "REFUNDED") : undefined;
  const history = [...(order.history ?? [])]
    .reverse()
    .concat([{ action: "order.created", text: "Sipariş oluşturuldu", actorName: "Sistem", createdAt: order.placedAt }]);
  const noteDirty = staffNote.trim() !== (order.staffNote ?? "").trim();
  const savedTracking = order.shipment.trackingNumber.trim();
  const trackUrl = cargoTrackUrl(order.shipment.carrier, savedTracking);
  const customerHref = `/admin/musteriler?q=${encodeURIComponent(order.email || order.customerName)}`;
  const phoneTel = telHref(order.phone);
  const phoneWa = whatsappHref(order.phone);

  const carrierSelect = useMemo(() => {
    if (carrierOther) return "__other";
    if (isListedCarrier(carrier)) return carrier;
    if (carrier) return "__other";
    return "";
  }, [carrier, carrierOther]);

  useEffect(() => {
    function onLeave(event: BeforeUnloadEvent) {
      if (!noteDirty) return;
      event.preventDefault();
      event.returnValue = "";
    }
    window.addEventListener("beforeunload", onLeave);
    return () => window.removeEventListener("beforeunload", onLeave);
  }, [noteDirty]);

  async function patch(body: Record<string, unknown>) {
    setBusy(true);
    setMessage("");
    try {
      const saved = await browserApi<{ data: AdminOrder }>(`/admin/orders/${order.id}`, { method: "PATCH", body: JSON.stringify(body) });
      setOrder(saved.data);
      if (body.staffNote !== undefined) setStaffNote(saved.data.staffNote ?? "");
      setCarrier(saved.data.shipment.carrier || (isListedCarrier(defaultCarrier) ? defaultCarrier : ""));
      setCarrierOther(Boolean(saved.data.shipment.carrier && !isListedCarrier(saved.data.shipment.carrier)));
      setTrackingNumber(saved.data.shipment.trackingNumber);
      setInvoiceIssued(saved.data.invoice?.issued ?? false);
      setInvoiceNumber(saved.data.invoice?.number ?? "");
      setInvoiceDate(saved.data.invoice?.date ?? "");
      if (body.invoiceIssued !== undefined || body.invoiceNumber !== undefined || body.invoiceDate !== undefined) {
        setInvoiceEdit(!(saved.data.invoice?.issued ?? false));
      }
      router.refresh();
      return saved.data;
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Güncellenemedi.");
      throw error;
    } finally {
      setBusy(false);
    }
  }

  function runAction(body: Record<string, unknown>, confirmText?: string) {
    if (confirmText && !window.confirm("Emin misiniz?")) return;
    void patch(body).catch(() => undefined);
  }

  function leaveIfClean(event: React.MouseEvent<HTMLAnchorElement>) {
    if (!noteDirty) return;
    if (!window.confirm("Kaydedilmemiş yönetici notunuz var. Sayfadan çıkmak istiyor musunuz?")) {
      event.preventDefault();
    }
  }

  async function copyText(value: string, ok: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(ok);
    } catch {
      setCopied("Kopyalanamadı.");
    }
  }

  async function saveStaffNote() {
    const next = staffNote.trim() || null;
    if ((order.staffNote ?? "") === (next ?? "")) return;
    setNoteStatus("saving");
    try {
      await patch({ staffNote: next });
      setNoteStatus("saved");
      window.setTimeout(() => setNoteStatus((current) => (current === "saved" ? "idle" : current)), 2500);
    } catch {
      setNoteStatus("error");
    }
  }

  async function saveInvoice() {
    try {
      await patch({ invoiceIssued, invoiceNumber: invoiceNumber.trim(), invoiceDate: invoiceDate.trim() });
    } catch {
      /* message already set */
    }
  }

  async function saveCargo() {
    const body: Record<string, unknown> = { carrier, trackingNumber };
    if (order.status === "PROCESSING" && order.allowedStatuses.includes("SHIPPED")) {
      const ship = window.confirm("Sipariş kargoya verildi olarak işaretlensin mi?");
      if (ship) body.status = "SHIPPED";
    }
    await patch(body).catch(() => undefined);
  }

  async function submitCancel() {
    if (!cancelReason) {
      setCancelError("İptal sebebi seçin.");
      return;
    }
    setCancelError("");
    try {
      await patch({ status: "CANCELLED", cancelReason, cancelNote: cancelNote.trim() || undefined });
      setCancelOpen(false);
      setCancelReason("");
      setCancelNote("");
    } catch {
      /* message already set */
    }
  }

  const otherLabel = otherCount === null || otherCount === undefined
    ? "Diğer sipariş sayısı: Bilgi yok"
    : otherCount === 0
      ? "Başka sipariş yok"
      : `${otherCount} siparişi daha var`;

  return (
    <div className="order-detail">
      <p className="order-back">
        <Link href="/admin/siparisler" onClick={leaveIfClean}>← Siparişlere dön</Link>
      </p>
      {message ? <p className="error">{message}</p> : null}

      <section className="order-hero">
        <div>
          <h1>Sipariş {order.number}</h1>
          <p className="order-hero-meta" suppressHydrationWarning>
            {formatWhenShort(order.placedAt)} · {blank(order.customerName)} · {formatTry(order.totalAmount)}
          </p>
          <p className="order-badge-row">
            <span className={badgeClass("order", order.status)}>{order.statusLabel}</span>
            <span className={badgeClass("payment", order.payment.status)}>{order.payment.statusLabel}</span>
            <span className={badgeClass("shipment", order.shipment.status)}>{order.shipment.statusLabel}</span>
          </p>
        </div>
        <div className="order-hero-actions">
          <button className="order-btn-ghost" type="button" onClick={() => window.print()}>Yazdır</button>
          {canCancel ? (
            <button className="order-btn-danger" type="button" disabled={busy} onClick={() => { setCancelOpen(true); setCancelError(""); }}>
              İptal et
            </button>
          ) : null}
          {nextStatus ? (
            <button className="order-btn-primary" type="button" disabled={busy} onClick={() => runAction({ status: nextStatus }, ORDER_ACTION[nextStatus]?.confirm)}>
              {HEADER_ACTION[nextStatus] ?? ORDER_ACTION[nextStatus]?.label ?? nextStatus}
            </button>
          ) : null}
        </div>
      </section>

      <div className="order-layout">
        <div className="order-col-main">
          <section className="order-card">
            <div className="order-card-head">
              <h2>Ürünler</h2>
              <span className="order-card-meta">{order.items.length} ürün</span>
            </div>
            <ul className="order-lines">
              {order.items.map((item) => (
                <li key={item.id}>
                  {item.image?.url ? (
                    <img className="order-item-thumb" src={item.image.url} alt={item.image.alt || item.productName} />
                  ) : (
                    <span className="order-item-thumb order-item-thumb-empty">Yok</span>
                  )}
                  <div className="order-line-info">
                    {item.productId ? (
                      <Link className="order-inline-link" href={`/admin/urunler/${item.productId}`}>{blank(item.productName)}</Link>
                    ) : (
                      <strong>{blank(item.productName)}</strong>
                    )}
                    <span>{blank(item.variantName)} · {blank(item.sku)}</span>
                  </div>
                  <span className="order-line-qty">{item.quantity} × {formatTry(item.unitAmount)}</span>
                  <span className="order-line-total">{formatTry(item.totalAmount)}</span>
                </li>
              ))}
            </ul>
            <dl className="order-totals">
              <div><dt>Ara toplam</dt><dd>{formatTry(order.subtotalAmount)}</dd></div>
              <div><dt>İndirim</dt><dd>{formatTry(order.discountAmount)}</dd></div>
              <div><dt>Kargo</dt><dd>{formatTry(order.shippingAmount)}</dd></div>
              <div className="order-grand"><dt>Genel toplam</dt><dd>{formatTry(order.totalAmount)}</dd></div>
            </dl>
          </section>

          <section className="order-card">
            <div className="order-card-head">
              <h2>Kargo</h2>
              <span className={badgeClass("shipment", order.shipment.status)}>{order.shipment.statusLabel}</span>
            </div>
            {order.canUpdate ? (
              <div className="order-cargo-row">
                <label className="field">Kargo firması
                  <select
                    value={carrierSelect}
                    onChange={(event) => {
                      const value = event.target.value;
                      if (value === "__other") {
                        setCarrierOther(true);
                        setCarrier(isListedCarrier(carrier) ? "" : carrier);
                      } else {
                        setCarrierOther(false);
                        setCarrier(value);
                      }
                    }}
                  >
                    <option value="">Seçin</option>
                    {CARGO_CARRIERS.map((name) => <option key={name} value={name}>{name}</option>)}
                    <option value="__other">Diğer</option>
                  </select>
                </label>
                {carrierSelect === "__other" ? (
                  <label className="field">Firma adı
                    <input value={carrier} onChange={(event) => setCarrier(event.target.value)} placeholder="Firma adı" />
                  </label>
                ) : null}
                <label className="field">Takip numarası
                  <input value={trackingNumber} onChange={(event) => setTrackingNumber(event.target.value)} />
                </label>
                <button className="order-btn-ghost order-cargo-save" type="button" disabled={busy} onClick={() => void saveCargo()}>
                  Kaydet
                </button>
              </div>
            ) : (
              <p className="order-muted">{blank(order.shipment.carrier)} · {blank(order.shipment.trackingNumber)}</p>
            )}
            {savedTracking ? (
              <p className="order-track">
                {trackUrl ? (
                  <a className="order-inline-link" href={trackUrl} target="_blank" rel="noreferrer">Kargoyu takip et</a>
                ) : (
                  <>
                    Takip no: {savedTracking}{" "}
                    <button className="order-link-btn" type="button" onClick={() => void copyText(savedTracking, "Takip numarası kopyalandı.")}>Kopyala</button>
                  </>
                )}
              </p>
            ) : null}
            {copied ? <p className="order-muted">{copied}</p> : null}
          </section>

          <section className="order-card">
            <div className="order-card-head"><h2>Sipariş geçmişi</h2></div>
            <ol className="order-timeline">
              {history.map((item, index) => (
                <li key={`${item.createdAt}-${index}`}>
                  <strong>{blank(item.text)}</strong>
                  <span suppressHydrationWarning>{formatWhenShort(item.createdAt)} · {blank(item.actorName)}</span>
                </li>
              ))}
            </ol>
          </section>
        </div>

        <aside className="order-col-side">
          <article className="order-card">
            <div className="order-card-head"><h2>Müşteri</h2></div>
            <p className="order-name">
              {order.customerName.trim() ? (
                <Link className="order-inline-link" href={customerHref} onClick={leaveIfClean}>{order.customerName}</Link>
              ) : "Bilgi yok"}
            </p>
            <p className="order-muted">
              {order.email.trim() ? (
                <a className="order-inline-link" href={`mailto:${order.email}`}>{order.email}</a>
              ) : "Bilgi yok"}
            </p>
            <p className="order-muted">
              {order.phone.trim() ? (
                <>
                  {phoneTel ? <a className="order-inline-link" href={phoneTel}>{order.phone}</a> : order.phone}
                  {phoneWa ? <> · <a className="order-inline-link" href={phoneWa} target="_blank" rel="noreferrer">WhatsApp</a></> : null}
                </>
              ) : "Bilgi yok"}
            </p>
            <p className="order-muted">{otherLabel}</p>
          </article>

          <article className="order-card">
            <div className="order-card-head">
              <h2>Teslimat adresi</h2>
              <button className="order-link-btn" type="button" onClick={() => void copyText(formatAddress(order.shippingAddress), "Adres kopyalandı.")}>Kopyala</button>
            </div>
            {addressFilled(order.shippingAddress) ? (
              <pre className="order-address">{compactAddress(order.shippingAddress)}</pre>
            ) : (
              <p className="order-muted">Bilgi yok</p>
            )}
          </article>

          <article className="order-card">
            <div className="order-card-head"><h2>Fatura</h2></div>
            {invoice.issued && !invoiceEdit ? (
              <>
                <p>Fatura kesildi{invoice.number ? ` · ${invoice.number}` : ""}{invoice.date ? ` · ${formatInvoiceDate(invoice.date)}` : ""}</p>
                {order.canUpdate ? (
                  <button className="order-link-btn" type="button" onClick={() => setInvoiceEdit(true)}>Düzenle</button>
                ) : null}
              </>
            ) : order.canUpdate ? (
              <div className="order-invoice-form">
                <label className="order-check">
                  <input type="checkbox" checked={invoiceIssued} onChange={(event) => setInvoiceIssued(event.target.checked)} />
                  Fatura kesildi
                </label>
                <label className="field">Fatura numarası
                  <input value={invoiceNumber} onChange={(event) => setInvoiceNumber(event.target.value)} />
                </label>
                <label className="field">Fatura tarihi
                  <input type="date" value={invoiceDate} onChange={(event) => setInvoiceDate(event.target.value)} />
                </label>
                <button className="order-btn-ghost" type="button" disabled={busy} onClick={() => void saveInvoice()}>Kaydet</button>
              </div>
            ) : null}
            {invoice.collected ? (
              <>
                <p>Tip: {invoice.typeLabel}</p>
                {invoice.type === "INDIVIDUAL" ? (
                  <>
                    <p>Ad soyad: {blank(invoice.personName)}</p>
                    <p>
                      TC: {invoice.nationalId || "Bilgi yok"}
                      {invoice.nationalId ? (
                        <> <button className="order-link-btn" type="button" onClick={() => void copyText(invoice.nationalId, "Kopyalandı.")}>Kopyala</button></>
                      ) : null}
                    </p>
                  </>
                ) : (
                  <>
                    <p>Ünvan: {blank(invoice.companyName)}</p>
                    <p>Vergi dairesi: {blank(invoice.taxOffice)}</p>
                    <p>
                      Vergi no: {invoice.taxId || "Bilgi yok"}
                      {invoice.taxId ? (
                        <> <button className="order-link-btn" type="button" onClick={() => void copyText(invoice.taxId, "Kopyalandı.")}>Kopyala</button></>
                      ) : null}
                    </p>
                    <p>{invoice.eInvoice ? "e-Fatura mükellefi" : "e-Fatura değil"}</p>
                    {invoice.nationalId ? (
                      <p>
                        TC: {invoice.nationalId}
                        {" "}
                        <button className="order-link-btn" type="button" onClick={() => void copyText(invoice.nationalId, "Kopyalandı.")}>Kopyala</button>
                      </p>
                    ) : null}
                  </>
                )}
                {invoice.sameAsShipping ? <p>Teslimat adresiyle aynı</p> : addressFilled(order.billingAddress) ? (
                  <pre className="order-address">{compactAddress(order.billingAddress)}</pre>
                ) : (
                  <p className="order-muted">Bilgi yok</p>
                )}
              </>
            ) : (
              <p className="order-muted">Fatura bilgisi alınmamış</p>
            )}
          </article>

          <article className="order-card">
            <div className="order-card-head">
              <h2>Ödeme</h2>
              <span className={badgeClass("payment", order.payment.status)}>{order.payment.status === "PENDING" ? "Bekleniyor" : order.payment.statusLabel}</span>
            </div>
            <p>Yöntem: {paymentMethodLabel(order.payment.provider, order.payment.providerLabel)}</p>
            <div className="order-pay-actions">
              {paidAction ? (
                <button className="order-btn-ghost" type="button" disabled={busy} onClick={() => runAction({ paymentStatus: paidAction }, PAYMENT_ACTION.PAID.confirm)}>
                  Ödendi işaretle
                </button>
              ) : null}
              {order.canUpdate && order.payment.status === "PAID" && refundAction ? (
                <button className="order-refund-link" type="button" disabled={busy} onClick={() => runAction({ paymentStatus: refundAction }, PAYMENT_ACTION.REFUNDED.confirm)}>
                  Ödeme iadesi işaretle
                </button>
              ) : null}
            </div>
          </article>

          <article className="order-card">
            <div className="order-card-head"><h2>Notlar</h2></div>
            <p className="order-note-label">Müşteri notu</p>
            <p className={order.customerNote ? undefined : "order-muted-em"}>{order.customerNote?.trim() || "Not bırakılmadı"}</p>
            <p className="order-note-label">Yönetici notu</p>
            {order.canUpdate ? (
              <>
                <textarea
                  className="order-note-sm"
                  value={staffNote}
                  placeholder="Yalnızca panelde görünür"
                  rows={3}
                  onChange={(event) => { setStaffNote(event.target.value); setNoteStatus("idle"); }}
                />
                <button className="order-btn-ghost order-note-save" type="button" disabled={busy || !noteDirty} onClick={() => void saveStaffNote()}>
                  Notu kaydet
                </button>
                {noteStatus === "saving" ? <p className="order-note-status">Kaydediliyor…</p> : null}
                {noteStatus === "saved" ? <p className="order-note-status">Kaydedildi</p> : null}
                {noteStatus === "error" ? <p className="order-note-status is-error">Kaydedilemedi, tekrar deneyin</p> : null}
              </>
            ) : <p className="order-muted">{order.staffNote?.trim() || "Bilgi yok"}</p>}
          </article>
        </aside>
      </div>

      {cancelOpen ? (
        <div className="order-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="order-cancel-title">
          <div className="order-modal">
            <h2 id="order-cancel-title">Siparişi iptal et</h2>
            <p>Stok geri eklenecek. İptal sebebini seçin.</p>
            <label className="field">Sebep
              <select value={cancelReason} onChange={(event) => setCancelReason(event.target.value as typeof cancelReason)}>
                <option value="">Seçin</option>
                {CANCEL_REASONS.map((reason) => <option key={reason} value={reason}>{reason}</option>)}
              </select>
            </label>
            <label className="field">Açıklama (isteğe bağlı)
              <textarea className="order-note-sm" rows={3} value={cancelNote} onChange={(event) => setCancelNote(event.target.value)} />
            </label>
            {cancelError ? <p className="error">{cancelError}</p> : null}
            <div className="order-modal-actions">
              <button className="order-btn-ghost" type="button" disabled={busy} onClick={() => setCancelOpen(false)}>Vazgeç</button>
              <button className="order-btn-danger" type="button" disabled={busy} onClick={() => void submitCancel()}>İptal et</button>
            </div>
          </div>
        </div>
      ) : null}

      <section className="order-print-sheet" aria-hidden="true">
        <h1>Sevk fişi</h1>
        <p><strong>Sipariş:</strong> {order.number}</p>
        <p suppressHydrationWarning><strong>Tarih:</strong> {formatWhen(order.placedAt)}</p>
        <p><strong>Müşteri:</strong> {blank(order.customerName)} · {blank(order.phone)}</p>
        <p><strong>Teslimat:</strong></p>
        <pre>{addressFilled(order.shippingAddress) ? formatAddress(order.shippingAddress) : "Bilgi yok"}</pre>
        <p><strong>Fatura:</strong></p>
        {invoice.collected ? (
          <>
            <p>Tip: {invoice.typeLabel}</p>
            {invoice.type === "INDIVIDUAL" ? (
              <p>Ad soyad: {blank(invoice.personName)} · TC: {invoice.nationalId || "Bilgi yok"}</p>
            ) : (
              <p>Ünvan: {blank(invoice.companyName)} · Vergi dairesi: {blank(invoice.taxOffice)} · Vergi no: {invoice.taxId || "Bilgi yok"}{invoice.eInvoice ? " · e-Fatura mükellefi" : ""}</p>
            )}
            <pre>{invoice.sameAsShipping ? "Teslimat adresiyle aynı" : (addressFilled(order.billingAddress) ? formatAddress(order.billingAddress) : "Bilgi yok")}</pre>
          </>
        ) : (
          <p>Fatura bilgisi alınmamış</p>
        )}
        <table>
          <thead>
            <tr><th>Ürün</th><th>Varyant</th><th>Adet</th></tr>
          </thead>
          <tbody>
            {order.items.map((item) => (
              <tr key={item.id}>
                <td>{item.productName}</td>
                <td>{item.variantName}</td>
                <td>{item.quantity}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {order.customerNote ? <p><strong>Müşteri notu:</strong> {order.customerNote}</p> : null}
      </section>
    </div>
  );
}
