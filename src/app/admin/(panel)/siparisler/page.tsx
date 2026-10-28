import { ApiError } from "@/lib/api";
import { adminApi } from "@/lib/admin";
import { OrderList } from "@/components/admin/OrderList";
import type { AdminOrder, OrderListMeta } from "@/lib/orders";

export default async function OrdersAdmin({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; from?: string; to?: string; page?: string }>;
}) {
  const query = await searchParams;
  const page = Math.max(1, Number(query.page) || 1);
  const params = new URLSearchParams();
  if (query.q) params.set("q", query.q);
  if (query.status) params.set("status", query.status);
  if (query.from) params.set("from", query.from);
  if (query.to) params.set("to", query.to);
  params.set("page", String(page));
  params.set("pageSize", "20");
  let body: { data: AdminOrder[]; meta: OrderListMeta };
  try {
    body = await adminApi(`/admin/orders?${params.toString()}`);
  } catch (error) {
    if (error instanceof ApiError && error.status === 403) {
      return (
        <>
          <div className="admin-top"><h1>Siparişler</h1></div>
          <section className="panel-admin"><p>Bu sayfayı görme yetkiniz yok.</p></section>
        </>
      );
    }
    throw error;
  }
  return (
    <>
      <div className="admin-top"><h1>Siparişler</h1></div>
      <OrderList
        orders={body.data}
        meta={body.meta}
        filters={{ q: query.q, status: query.status, from: query.from, to: query.to }}
        page={page}
      />
    </>
  );
}
