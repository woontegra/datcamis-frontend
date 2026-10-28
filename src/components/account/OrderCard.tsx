import Link from "next/link";
import { AccountIcon } from "@/components/account/AccountNav";
import { formatDate, type AccountOrderSummary } from "@/lib/account";
import { productPhotoSlot } from "@/lib/home-visual";
import { formatTry } from "@/lib/money";
import { cargoTrackUrl } from "@/lib/orders";

export function StatusBadge({ status }: { status: AccountOrderSummary["status"] }) {
  return <span className={`account-badge is-${status.key}`}>{status.label}</span>;
}

export function OrderCard({ order }: { order: AccountOrderSummary }) {
  const trackUrl = order.shipment.inTransit ? cargoTrackUrl(order.shipment.carrier, order.shipment.trackingNumber) : null;
  const href = `/hesap/siparisler/${order.id}`;
  return (
    <article className="account-order">
      <header className="account-order-head">
        <div>
          <p className="account-order-number">{order.number}</p>
          <p className="account-order-meta">{formatDate(order.placedAt)} · {order.itemCount} ürün</p>
        </div>
        <StatusBadge status={order.status} />
      </header>
      <div className="account-order-body">
        <div className="account-order-thumbs">
          {order.images.map((image, index) => (
            <img key={index} src={image?.url || productPhotoSlot("limon-cicegi-kolonyasi")} alt={image?.alt ?? ""} />
          ))}
          {order.shipment.inTransit && order.shipment.carrier ? (
            <span className="account-order-cargo">
              {order.shipment.carrier}{order.shipment.trackingNumber ? ` · ${order.shipment.trackingNumber}` : ""}
            </span>
          ) : null}
        </div>
        <strong className="account-order-total">{formatTry(order.totalAmount)}</strong>
      </div>
      <div className="account-order-actions">
        {order.awaitingHavale ? <Link className="text-btn account-btn" href={`${href}#havale`}>Havale bilgilerini gör</Link> : null}
        {trackUrl ? (
          <a className="green-btn account-btn" href={trackUrl} target="_blank" rel="noopener noreferrer">
            <AccountIcon name="truck" />
            Kargoyu takip et
          </a>
        ) : null}
        <Link className="text-btn account-btn" href={href}>Detay</Link>
      </div>
    </article>
  );
}
