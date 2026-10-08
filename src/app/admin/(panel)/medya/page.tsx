import { Rows } from "@/components/admin/Rows";
import { adminApi } from "@/lib/admin";

export default async function MediaAdmin() {
  const body = await adminApi<{ data: { filename: string; mimeType: string; sizeBytes: number; alt: string | null }[] }>("/admin/media");
  return (
    <>
      <div className="admin-top"><h1>Medya Kütüphanesi</h1></div>
      <section className="panel-admin">
        <Rows headers={["Dosya", "Tür", "Boyut", "Alt"]} rows={body.data.map((row) => [row.filename, row.mimeType, `${row.sizeBytes} B`, row.alt || ""])} />
      </section>
    </>
  );
}
