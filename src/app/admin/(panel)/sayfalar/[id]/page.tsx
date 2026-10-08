import { PageEditor } from "@/components/admin/PageEditor";
import { adminApi } from "@/lib/admin";
import type { PageDocument } from "@/lib/types";

export default async function EditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await adminApi<{ data: { id: string; title: string; slug: string; status: string; revisions: { version: number; document: PageDocument }[] } }>(`/admin/pages/${id}`);
  return (
    <>
      <div className="admin-top"><h1>Page Builder</h1></div>
      <PageEditor page={body.data} />
    </>
  );
}
