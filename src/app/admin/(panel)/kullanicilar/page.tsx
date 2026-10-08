import { Rows } from "@/components/admin/Rows";
import { adminApi } from "@/lib/admin";

export default async function UsersAdmin() {
  const body = await adminApi<{ data: { name: string; email: string; role: string; status: string }[] }>("/admin/users");
  return (
    <>
      <div className="admin-top"><h1>Kullanıcı Yönetimi</h1></div>
      <section className="panel-admin"><Rows headers={["Ad", "E-posta", "Rol", "Durum"]} rows={body.data.map((row) => [row.name, row.email, row.role, row.status])} /></section>
    </>
  );
}
