import { Rows } from "@/components/admin/Rows";
import { adminApi } from "@/lib/admin";
import { formatTry } from "@/lib/money";
import type { Dashboard } from "@/lib/types";

function Chart({ series }: { series: Dashboard["salesSeries"] }) {
  const max = Math.max(1, ...series.map((item) => item.amount));
  const width = 640;
  const height = 120;
  const points = series.map((item, index) => {
    const x = (index / Math.max(series.length - 1, 1)) * width;
    const y = height - (item.amount / max) * (height - 8) - 4;
    return `${x},${y}`;
  }).join(" ");
  return (
    <svg viewBox={`0 0 ${width} ${height}`} width="100%" height="120" role="img" aria-label="Son 14 gün ciro">
      <polyline fill="none" stroke="#1b3a2d" strokeWidth="2" points={points} />
    </svg>
  );
}

export default async function DashboardPage() {
  const body = await adminApi<{ data: Dashboard }>("/admin/dashboard");
  const data = body.data;
  return (
    <>
      <div className="admin-top"><h1>Dashboard</h1></div>
      <section className="metric-grid">
        <article className="metric"><span>Toplam ciro</span><strong>{formatTry(data.revenueAmount)}</strong></article>
        <article className="metric"><span>Sipariş</span><strong>{data.orderCount}</strong></article>
        <article className="metric"><span>Müşteri</span><strong>{data.customerCount}</strong></article>
        <article className="metric"><span>Ortalama sepet</span><strong>{formatTry(data.averageOrderAmount)}</strong></article>
        <article className="metric"><span>Dönüşüm</span><strong>{data.conversionRate === null ? "—" : data.conversionRate}</strong><span>Ölçüm bağlı değil</span></article>
      </section>
      <section className="split" style={{ marginTop: "0.7rem" }}>
        <article className="panel-admin">
          <strong>Satış</strong>
          <Chart series={data.salesSeries} />
        </article>
        <article className="panel-admin">
          <strong>En çok satanlar</strong>
          <Rows
            headers={["Ürün", "Adet", "Tutar"]}
            rows={data.topProducts.map((item) => [item.productName, String(item.quantity), formatTry(item.totalAmount)])}
          />
        </article>
      </section>
      <section className="split" style={{ marginTop: "0.7rem" }}>
        <article className="panel-admin">
          <strong>Düşük stok</strong>
          <Rows
            headers={["Ürün", "Varyant", "Elde", "Eşik"]}
            rows={data.lowStock.map((item) => [`${item.productName}${item.isSeed ? " (seed)" : ""}`, item.variantName, String(item.onHand), String(item.lowThreshold)])}
          />
        </article>
        <article className="panel-admin">
          <strong>Son siparişler</strong>
          <Rows
            headers={["No", "Durum", "Tutar"]}
            rows={data.recentOrders.map((order) => [order.number, order.status, formatTry(order.totalAmount)])}
          />
        </article>
      </section>
    </>
  );
}
