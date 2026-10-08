import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPost, orNotFound } from "@/lib/store";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const post = await orNotFound(() => getPost(slug));
  if (!post) return { title: "Yazı" };
  return { title: post.title, description: post.seo?.description || post.excerpt };
}

export default async function PostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await orNotFound(() => getPost(slug));
  if (!post) notFound();
  return (
    <article className="wrap section">
      {post.isSeed ? <span className="seed-pill">Seed</span> : null}
      <h1>{post.title}</h1>
      <p className="lede">{post.body}</p>
    </article>
  );
}
