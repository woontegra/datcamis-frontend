import { Rows } from "@/components/admin/Rows";
import { adminApi } from "@/lib/admin";

export default async function CustomersAdmin({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const query = q?.trim() ?? "";
  const body = await adminApi<{ data: { email: string; firstName: string; lastName: string }[] }>("/admin/customers");
  const needle = query.toLocaleLowerCase("tr");
  const rows = query
    ? body.data.filter((row) => {
        const name = `${row.firstName} ${row.lastName}`.toLocaleLowerCase("tr");
        return name.includes(needle) || row.email.toLocaleLowerCase("tr").includes(needle);
      })
    : body.data;
  return (
    <>
      <div className="admin-top"><h1>Müşteriler</h1></div>
      {query ? <p className="order-muted">Arama: {query}</p> : null}
      <section className="panel-admin">
        <Rows headers={["Ad", "E-posta"]} rows={rows.map((row) => [`${row.firstName} ${row.lastName}`, row.email])} />
      </section>
    </>
  );
}
