import { NewsletterForm } from "@/components/store/NewsletterForm";
import { ProductCard } from "@/components/store/ProductCard";
import { getCollection, getPosts, getProducts } from "@/lib/store";
import type { PageBlock, PageDocument, Visibility } from "@/lib/types";

function visibilityClass(visibility: Visibility) {
  return [visibility.mobile ? "" : "max-md:hidden", visibility.tablet ? "" : "md:max-lg:hidden", visibility.desktop ? "" : "lg:hidden"]
    .filter(Boolean)
    .join(" ");
}

function spacingStyle(spacing: { top: number; right: number; bottom: number; left: number }) {
  return { padding: `${spacing.top}px ${spacing.right}px ${spacing.bottom}px ${spacing.left}px` };
}

function columnsClass(columns: number) {
  if (columns === 2) return "grid gap-4 md:grid-cols-2";
  if (columns === 3) return "grid gap-4 md:grid-cols-2 lg:grid-cols-3";
  if (columns === 4) return "grid gap-4 sm:grid-cols-2 xl:grid-cols-4";
  return "grid gap-4";
}

async function BlockView({ block }: { block: PageBlock }) {
  const props = block.props;
  if (block.type === "hero") {
    return (
      <div>
        <p className="eyebrow">{String(props.eyebrow || "")}</p>
        <h2>{String(props.title || "")}</h2>
        <p className="lede">{String(props.text || "")}</p>
        {props.ctaHref ? <a className="green-btn" href={String(props.ctaHref)}>{String(props.ctaLabel || "Devam")}</a> : null}
      </div>
    );
  }
  if (block.type === "text") {
    return (
      <div>
        <p className="eyebrow">{String(props.eyebrow || "")}</p>
        <h2>{String(props.title || "")}</h2>
        <p>{String(props.body || "")}</p>
      </div>
    );
  }
  if (block.type === "image") {
    return props.mediaId ? <img src={`/api/v1/media/${props.mediaId}/file`} alt={String(props.alt || "")} /> : <p>Görsel seçilmedi.</p>;
  }
  if (block.type === "product-list") {
    const params = new URLSearchParams();
    if (props.collectionSlug) params.set("collection", String(props.collectionSlug));
    if (props.categorySlug) params.set("category", String(props.categorySlug));
    params.set("pageSize", String(props.limit || 4));
    const products = await getProducts(`?${params.toString()}`).catch(() => ({ data: [] }));
    return (
      <div>
        {props.title ? <h2>{String(props.title)}</h2> : null}
        <div className="product-grid">{products.data.map((product) => <ProductCard key={product.id} product={product} />)}</div>
      </div>
    );
  }
  if (block.type === "collection" || block.type === "category") {
    const slug = String(props.slug || "");
    const record = slug && block.type === "collection" ? await getCollection(slug).catch(() => null) : null;
    return <div className="panel"><h3>{String(props.title || record?.name || slug || "Kayıt")}</h3><p>{record?.description}</p></div>;
  }
  if (block.type === "slider" || block.type === "feature-strip" || block.type === "columns") {
    const items = Array.isArray(props.slides) ? props.slides : Array.isArray(props.items) ? props.items : [];
    return (
      <div className="advantage-grid">
        {items.map((item, index) => (
          <article className="panel" key={index}>
            <h3>{String((item as { title?: string }).title || "")}</h3>
            <p>{String((item as { text?: string }).text || "")}</p>
          </article>
        ))}
      </div>
    );
  }
  if (block.type === "gallery") {
    const ids = Array.isArray(props.mediaIds) ? props.mediaIds : [];
    return <div className="product-grid">{ids.map((id) => <img key={String(id)} src={`/api/v1/media/${id}/file`} alt="" />)}</div>;
  }
  if (block.type === "campaign") {
    return (
      <div className="story-band">
        <h2>{String(props.title || "")}</h2>
        <p>{String(props.text || "")}</p>
        {props.href ? <a className="gold-btn" href={String(props.href)}>{String(props.ctaLabel || "İncele")}</a> : null}
      </div>
    );
  }
  if (block.type === "countdown") {
    return <p>{String(props.title || "Geri sayım")} · {String(props.endsAt || "")}</p>;
  }
  if (block.type === "blog") {
    const posts = await getPosts().catch(() => []);
    return (
      <div>
        <h2>{String(props.title || "Notlar")}</h2>
        <div className="post-grid">
          {posts.slice(0, Number(props.limit || 3)).map((post) => (
            <article className="post-card" key={post.slug}><h3>{post.title}</h3><p>{post.excerpt}</p></article>
          ))}
        </div>
      </div>
    );
  }
  if (block.type === "newsletter") return <NewsletterForm title={String(props.title || "Bülten")} text={String(props.text || "")} />;
  if (block.type === "spacer") return <div style={{ height: Number(props.size || 32) }} />;
  return null;
}

export async function PageRenderer({ document }: { document: PageDocument }) {
  return (
    <div>
      {document.sections.map((section) => (
        <section key={section.id} className={`${visibilityClass(section.visibility)} ${section.contained ? "wrap" : ""}`} style={spacingStyle(section.spacing)}>
          <div className={columnsClass(section.columns)}>
            {section.blocks.map((block) => (
              <div key={block.id} className={visibilityClass(block.visibility)} style={spacingStyle(block.spacing)}>
                <BlockView block={block} />
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
