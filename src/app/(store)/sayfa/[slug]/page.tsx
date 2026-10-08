import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageRenderer } from "@/components/page-builder/PageRenderer";
import { getPage, orNotFound } from "@/lib/store";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const page = await orNotFound(() => getPage(slug));
  if (!page) return { title: "Sayfa" };
  return { title: page.title, description: page.seo?.description || page.title };
}

export default async function CmsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const page = await orNotFound(() => getPage(slug));
  if (!page) notFound();
  return (
    <div className="section">
      <PageRenderer document={page.document} />
    </div>
  );
}
