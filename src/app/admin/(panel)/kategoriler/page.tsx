import { Rows } from "@/components/admin/Rows";
import { adminApi } from "@/lib/admin";

export default async function CategoriesAdmin() {
  const body = await adminApi<{ data: { name: string; slug: string }[] }>("/admin/categories");
  return (
    <>
      <div className="admin-top"><h1>Kategoriler</h1></div>
      <section className="panel-admin"><Rows headers={["Ad", "Slug"]} rows={body.data.map((row) => [row.name, row.slug])} /></section>
    </>
  );
}
