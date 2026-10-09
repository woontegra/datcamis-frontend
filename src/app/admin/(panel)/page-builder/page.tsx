import Link from "next/link";
import { adminApi } from "@/lib/admin";

export default async function PageBuilderIndex() {
  const body = await adminApi<{ data: { id: string; slug: string; title: string; status: string }[] }>("/admin/pages");
  return (
    <>
      <div className="admin-top"><h1>Page Builder</h1></div>
      <section className="panel-admin">
        <p>Bölüm ve blok belgesi, taslak/yayın revizyonu ve cihaz görünürlüğü burada durur. Sürükle-bırak editör sonraki aşama.</p>
        <p><Link href="/admin/editor">Görsel editör</Link></p>
        {body.data.map((page) => (
          <p key={page.id}>
            <Link href={`/admin/sayfalar/${page.id}`}>{page.title}</Link> · {page.status}
            {page.slug === "ana-sayfa" ? " · Mağaza ana sayfasına yayınlama henüz desteklenmiyor." : ""}
          </p>
        ))}
      </section>
    </>
  );
}
