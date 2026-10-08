import { Rows } from "@/components/admin/Rows";
import { adminApi } from "@/lib/admin";

export default async function CustomersAdmin() {
  const body = await adminApi<{ data: { email: string; firstName: string; lastName: string }[] }>("/admin/customers");
  return (
    <>
      <div className="admin-top"><h1>Müşteriler</h1></div>
      <section className="panel-admin"><Rows headers={["Ad", "E-posta"]} rows={body.data.map((row) => [`${row.firstName} ${row.lastName}`, row.email])} /></section>
    </>
  );
}
