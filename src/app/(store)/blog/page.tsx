import type { Metadata } from "next";
import Link from "next/link";
import { getPosts } from "@/lib/store";

export const metadata: Metadata = { title: "Blog" };

export default async function BlogPage() {
  const posts = await getPosts().catch(() => null);
  return (
    <div className="wrap section">
      <p className="eyebrow">Defter</p>
      <h1>Blog</h1>
      {posts ? (
        <div className="post-grid">
          {posts.map((post) => (
            <article className="post-card" key={post.slug}>
              {post.isSeed ? <span className="seed-pill">Seed</span> : null}
              <h2><Link href={`/blog/${post.slug}`}>{post.title}</Link></h2>
              <p>{post.excerpt}</p>
            </article>
          ))}
        </div>
      ) : <p>Yazılar yüklenemedi.</p>}
    </div>
  );
}
