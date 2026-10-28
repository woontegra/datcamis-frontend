import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AccountIcon } from "@/components/account/AccountNav";
import { StatusBadge } from "@/components/account/OrderCard";
import { CopyButton } from "@/components/store/CopyButton";
import { formatIbanGroups } from "@/lib/iban";
import { ApiError } from "@/lib/api";
import { addressLines, formatDate, type AccountOrderDetail } from "@/lib/account";
import { customerApi } from "@/lib/account-server";
import { productPhotoSlot } from "@/lib/home-visual";
import { formatTry } from "@/lib/money";
import { cargoTrackUrl } from "@/lib/orders";

export const metadata: Metadata = { title: "Sipariş detayı" };

async function load(id: string) {
  try {
    const body = await customerApi<{ data: AccountOrderDetail }>(`/account/orders/${encodeURIComponent(id)}`, `/hesap/siparisler/${id}`);
    return body.data;
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  }
}

export default async function AccountOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const order = await load(id);
  const trackUrl = order.shipment.inTransit ? cargoTrackUrl(order.shipment.carrier, order.shipment.trackingNumber) : null;
  const cancelled = order.status.key === "cancelled";
  const invoiceName = order.invoice.type === "CORPORATE" ? order.invoice.companyName : order.invoice.personName;

  return (
    <div className="account-stack">
      <Link className="account-back" href="/hesap/siparisler">‹ Siparişlerim</Link>
      <section className="checkout-block account-detail-head">
        <div className="account-order-head">
          <div>
            <h2>{order.number}</h2>
            <p className="account-order-meta">{formatDate(order.placedAt)} · {order.itemCount} ürün</p>
          </div>
          <StatusBadge status={order.status} />
        </div>
        <ol className={`account-timeline ${cancelled ? "is-cancelled" : ""}`}>
          {order.timeline.map((step) => (
            <li key={step.key} className={`${step.done ? "is-done" : ""} is-${step.key}`}>
              <span className="account-timeline-dot" aria-hidden="true" />
              <span className="account-timeline-label">
                {step.label}
                {step.at ? <small>{formatDate(step.at)}</small> : null}
              </span>
            </li>
          ))}
        </ol>
      </section>

      {order.havale ? (
        <section className="checkout-block" id="havale">
          <h2>Havale / EFT bilgileri</h2>
          <div className="thanks-amount">
            <span>Ödenecek tutar</span>
            <strong>{formatTry(order.totalAmount)}</strong>
          </div>
          <div className="thanks-row">
            <span>Banka</span>
            <p>{order.havale.bankName}</p>
          </div>
          <div className="thanks-row">
            <span>Alıcı</span>
            <p>{order.havale.accountHolder}</p>
            <CopyButton value={order.havale.accountHolder} label="Alıcı" />
          </div>
          <div className="thanks-row">
            <span>IBAN</span>
            <p className="thanks-iban">{formatIbanGroups(order.havale.iban)}</p>
            <CopyButton value={order.havale.iban.replace(/\s+/g, "").toUpperCase()} label="IBAN" />
          </div>
          <div className="thanks-row">
            <span>Açıklama</span>
            <p>{order.number}</p>
            <CopyButton value={order.number} label="Açıklama" />
          </div>
          <p className="thanks-warn">Ödemenizin eşleşmesi için açıklamaya mutlaka <strong>{order.number}</strong> yazın.</p>
        </section>
      ) : null}

      <div className="account-detail-grid">
        <section className="checkout-block">
          <h2>Ürünler</h2>
          <ul className="summary-items">
            {order.items.map((item) => (
              <li key={item.id}>
                <img src={item.image?.url || productPhotoSlot("limon-cicegi-kolonyasi")} alt="" />
                <div>
                  <p>{item.productName}</p>
                  <p>{item.variantName} × {item.quantity}</p>
                </div>
                <span>{formatTry(item.totalAmount)}</span>
              </li>
            ))}
          </ul>
          <div className="summary-row"><span>Ara toplam</span><span>{formatTry(order.subtotalAmount)}</span></div>
          {order.discountAmount > 0 ? <div className="summary-row"><span>İndirim</span><span>−{formatTry(order.discountAmount)}</span></div> : null}
          <div className="summary-row"><span>Kargo</span><span>{formatTry(order.shippingAmount)}</span></div>
          <div className="summary-row is-total"><span>Toplam</span><span>{formatTry(order.totalAmount)}</span></div>
          {order.paymentMethod ? <div className="summary-row"><span>Ödeme yöntemi</span><span>{order.paymentMethod}</span></div> : null}
        </section>

        <div className="account-stack">
          {order.shipment.carrier || order.shipment.trackingNumber ? (
            <section className="checkout-block">
              <h2>Kargo</h2>
              <p className="account-text">
                {order.shipment.carrier || "Kargo firması"}
                {order.shipment.trackingNumber ? <><br />Takip no: {order.shipment.trackingNumber}</> : null}
              </p>
              {trackUrl ? (
                <a className="green-btn account-btn" href={trackUrl} target="_blank" rel="noopener noreferrer">
                  <AccountIcon name="truck" />
                  Kargoyu takip et
                </a>
              ) : null}
            </section>
          ) : null}

          <section className="checkout-block">
            <h2>Teslimat adresi</h2>
            <p className="account-text">{addressLines(order.shippingAddress).map((line, index) => <span key={index}>{line}<br /></span>)}</p>
          </section>

          <section className="checkout-block">
            <h2>Fatura bilgileri</h2>
            <p className="account-text">
              <span>{order.invoice.typeLabel} fatura<br /></span>
              {invoiceName ? <span>{invoiceName}<br /></span> : null}
              {order.invoice.type === "CORPORATE" && order.invoice.taxOffice ? <span>{order.invoice.taxOffice} V.D. · {order.invoice.taxId}<br /></span> : null}
              {order.invoice.nationalId ? <span>TC: {order.invoice.nationalId}<br /></span> : null}
              {order.invoice.sameAsShipping
                ? <span>Teslimat adresiyle aynı</span>
                : addressLines({ ...order.invoice.address, fullName: "", phone: "" }).map((line, index) => <span key={index}>{line}<br /></span>)}
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
