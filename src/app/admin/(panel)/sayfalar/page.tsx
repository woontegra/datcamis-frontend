import Link from "next/link";
import { adminApi } from "@/lib/admin";

export default async function PagesAdmin() {
  const body = await adminApi<{ data: { id: string; slug: string; title: string; status: string; latestVersion: number }[] }>("/admin/pages");
  return (
    <>
      <div className="admin-top"><h1>Sayfalar</h1></div>
      <section className="panel-admin">
        {body.data.map((page) => (
          <p key={page.id}>
            <Link href={`/admin/sayfalar/${page.id}`}>{page.title}</Link> · {page.status} · v{page.latestVersion}
            {page.slug === "ana-sayfa" ? " · Mağaza ana sayfasına yayınlama henüz desteklenmiyor." : ""}
          </p>
        ))}
        {body.data.length === 0 ? <p>Sayfa yok.</p> : null}
      </section>
    </>
  );
}
