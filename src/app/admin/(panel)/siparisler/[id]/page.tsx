import { ApiError } from "@/lib/api";
import { adminApi } from "@/lib/admin";
import { OrderDetail } from "@/components/admin/OrderDetail";
import type { AdminOrder } from "@/lib/orders";

export default async function OrderAdminPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const body = await adminApi<{ data: AdminOrder }>(`/admin/orders/${id}`);
    return <OrderDetail order={body.data} />;
  } catch (error) {
    if (error instanceof ApiError && error.status === 403) {
      return (
        <>
          <div className="admin-top"><h1>Sipariş</h1></div>
          <section className="panel-admin"><p>Bu siparişi görme yetkiniz yok.</p></section>
        </>
      );
    }
    if (error instanceof ApiError && error.status === 404) {
      return (
        <>
          <div className="admin-top"><h1>Sipariş</h1></div>
          <section className="panel-admin"><p>Sipariş bulunamadı.</p></section>
        </>
      );
    }
    throw error;
  }
}
