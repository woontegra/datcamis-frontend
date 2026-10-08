import type { Metadata } from "next";
import { PageRenderer } from "@/components/page-builder/PageRenderer";
import { getPage } from "@/lib/store";

export const metadata: Metadata = { title: "Hikayemiz" };

export default async function StoryPage() {
  const page = await getPage("hikayemiz").catch(() => null);
  return (
    <div className="section">
      {page ? <PageRenderer document={page.document} /> : <div className="wrap"><p>Hikâye sayfası yüklenemedi.</p></div>}
    </div>
  );
}
