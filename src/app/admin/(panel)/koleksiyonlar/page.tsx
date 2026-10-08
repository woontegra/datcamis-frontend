import { Rows } from "@/components/admin/Rows";
import { adminApi } from "@/lib/admin";

export default async function CollectionsAdmin() {
  const body = await adminApi<{ data: { name: string; slug: string }[] }>("/admin/collections");
  return (
    <>
      <div className="admin-top"><h1>Koleksiyonlar</h1></div>
      <section className="panel-admin"><Rows headers={["Ad", "Slug"]} rows={body.data.map((row) => [row.name, row.slug])} /></section>
    </>
  );
}
