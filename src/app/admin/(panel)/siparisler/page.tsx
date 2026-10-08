import { Rows } from "@/components/admin/Rows";
import { adminApi } from "@/lib/admin";
import { formatTry } from "@/lib/money";

type Order = { number: string; email: string; status: string; totalAmount: number; placedAt: string; payments: { provider: string; status: string }[] };

export default async function OrdersAdmin() {
  const body = await adminApi<{ data: Order[] }>("/admin/orders");
  return (
    <>
      <div className="admin-top"><h1>Siparişler</h1></div>
      <section className="panel-admin">
        <Rows
          headers={["No", "E-posta", "Durum", "Ödeme", "Tutar"]}
          rows={body.data.map((order) => [order.number, order.email, order.status, order.payments[0]?.provider || "—", formatTry(order.totalAmount)])}
        />
      </section>
    </>
  );
}
