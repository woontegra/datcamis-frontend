"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatTry } from "@/lib/money";
import { badgeClass, blank, formatWhen, ORDER_STATUS_FILTERS, paymentMethodLabel, type AdminOrder, type OrderListMeta } from "@/lib/orders";

function href(values: Record<string, string | undefined>, page?: number) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(values)) {
    if (value) params.set(key, value);
  }
  if (page && page > 1) params.set("page", String(page));
  const query = params.toString();
  return query ? `/admin/siparisler?${query}` : "/admin/siparisler";
}

function countFor(tab: string, counts?: Record<string, number>) {
  if (!counts) return null;
  if (!tab) return counts.all ?? 0;
  return counts[tab] ?? 0;
}

export function OrderList({
  orders,
  meta,
  filters,
  page,
}: {
  orders: AdminOrder[];
  meta: OrderListMeta;
  filters: { q?: string; status?: string; from?: string; to?: string };
  page: number;
}) {
  const router = useRouter();
  const pages = Math.max(1, Math.ceil(meta.total / meta.pageSize));

  function open(id: string) {
    router.push(`/admin/siparisler/${id}`);
  }

  return (
    <>
      <nav className="order-tabs" aria-label="Sipariş durumları">
        {ORDER_STATUS_FILTERS.map((tab) => {
          const active = (filters.status ?? "") === tab.value;
          const count = countFor(tab.value, meta.counts);
          return (
            <Link
              key={tab.value || "all"}
              className={`order-tab${active ? " is-active" : ""}`}
              href={href({ ...filters, status: tab.value || undefined }, 1)}
            >
              {tab.label}
              {count !== null ? <span className="order-tab-count">{count}</span> : null}
            </Link>
          );
        })}
      </nav>
      <form className="panel-admin order-filters" method="get">
        {filters.status ? <input type="hidden" name="status" value={filters.status} /> : null}
        <label className="field">Ara
          <input name="q" defaultValue={filters.q ?? ""} placeholder="Sipariş no, ad, e-posta, telefon" />
        </label>
        <label className="field">Başlangıç
          <input name="from" type="date" defaultValue={filters.from ?? ""} />
        </label>
        <label className="field">Bitiş
          <input name="to" type="date" defaultValue={filters.to ?? ""} />
        </label>
        <button className="green-btn" type="submit">Filtrele</button>
      </form>
      <section className="panel-admin" style={{ marginTop: "0.7rem" }}>
        <div className="table-scroll only-desktop">
          <table className="order-table">
            <thead>
              <tr>
                <th>Sipariş no</th>
                <th>Tarih</th>
                <th>Müşteri</th>
                <th>Ürün</th>
                <th>Tutar</th>
                <th>Ödeme yöntemi</th>
                <th>Sipariş</th>
                <th>Ödeme</th>
                <th>Kargo</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr
                  key={order.id}
                  className="order-row"
                  tabIndex={0}
                  onClick={() => open(order.id)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") open(order.id);
                  }}
                >
                  <td>
                    <Link className="order-number-link" href={`/admin/siparisler/${order.id}`} onClick={(event) => event.stopPropagation()}>
                      {order.number}
                    </Link>
                  </td>
                  <td suppressHydrationWarning>{formatWhen(order.placedAt)}</td>
                  <td>
                    {blank(order.customerName)}
                    <br />
                    {blank(order.phone)}
                  </td>
                  <td>{blank(order.itemSummary)}</td>
                  <td>{formatTry(order.totalAmount)}</td>
                  <td>{paymentMethodLabel(order.payment.provider, order.payment.providerLabel)}</td>
                  <td><span className={badgeClass("order", order.status)}>{order.statusLabel}</span></td>
                  <td><span className={badgeClass("payment", order.payment.status)}>{order.payment.statusLabel}</span></td>
                  <td><span className={badgeClass("shipment", order.shipment.status)}>{order.shipment.statusLabel}</span></td>
                  <td>
                    <Link className="text-btn" href={`/admin/siparisler/${order.id}`} onClick={(event) => event.stopPropagation()}>
                      Detay
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="only-mobile order-mobile-list">
          {orders.map((order) => (
            <article className="admin-card order-mobile-card" key={order.id} onClick={() => open(order.id)}>
              <p style={{ margin: 0 }}>
                <Link className="order-number-link" href={`/admin/siparisler/${order.id}`} onClick={(event) => event.stopPropagation()}>
                  {order.number}
                </Link>
              </p>
              <p style={{ margin: 0 }} suppressHydrationWarning>{formatWhen(order.placedAt)}</p>
              <p style={{ margin: 0 }}>{blank(order.customerName)} · {blank(order.phone)}</p>
              <p style={{ margin: 0 }}>{blank(order.itemSummary)}</p>
              <p style={{ margin: 0 }}>{formatTry(order.totalAmount)} · {paymentMethodLabel(order.payment.provider, order.payment.providerLabel)}</p>
              <p className="order-badge-row">
                <span className={badgeClass("order", order.status)}>{order.statusLabel}</span>
                <span className={badgeClass("payment", order.payment.status)}>{order.payment.statusLabel}</span>
                <span className={badgeClass("shipment", order.shipment.status)}>{order.shipment.statusLabel}</span>
              </p>
              <Link className="text-btn" href={`/admin/siparisler/${order.id}`} onClick={(event) => event.stopPropagation()}>Detay</Link>
            </article>
          ))}
        </div>
        {orders.length === 0 ? <p>Kayıt yok.</p> : null}
        {pages > 1 ? (
          <p className="order-pager">
            {page > 1 ? <Link href={href(filters, page - 1)}>Önceki</Link> : null}
            <span>Sayfa {page} / {pages}</span>
            {page < pages ? <Link href={href(filters, page + 1)}>Sonraki</Link> : null}
          </p>
        ) : null}
      </section>
    </>
  );
}
