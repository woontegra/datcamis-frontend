import Link from "next/link";
import { BulkPriceManager, type AdminVariantRow } from "@/components/admin/inventory/BulkPriceManager";
import { ApiError } from "@/lib/api";
import { adminApi } from "@/lib/admin";
import { categoryOptions, type CategoryOption } from "@/lib/category-options";
import { PRODUCT_STATUS_FILTERS } from "@/lib/products";

type Query = { q?: string; category?: string; status?: string; page?: string };

export default async function BulkPriceAdmin({ searchParams }: { searchParams: Promise<Query> }) {
  const query = await searchParams;
  const page = Math.max(1, Number(query.page) || 1);
  const params = new URLSearchParams();
  if (query.q) params.set("q", query.q);
  if (query.category) params.set("category", query.category);
  if (query.status) params.set("status", query.status);

  let body: { data: AdminVariantRow[]; meta: { page: number; pageSize: number; total: number; canEditPrice: boolean } };
  let categories: CategoryOption[];
  try {
    [body, { data: categories }] = await Promise.all([
      adminApi<typeof body>(`/admin/variants?${params.toString()}&page=${page}&pageSize=50`),
      adminApi<{ data: CategoryOption[] }>("/admin/categories"),
    ]);
  } catch (error) {
    if (error instanceof ApiError && error.status === 403) {
      return <section className="panel-admin"><p>Bu sayfayı görme yetkiniz yok.</p></section>;
    }
    throw error;
  }

  const pages = Math.max(1, Math.ceil(body.meta.total / body.meta.pageSize));
  const hrefFor = (target: number) => {
    const next = new URLSearchParams(params);
    next.set("page", String(target));
    return `/admin/urunler/toplu-fiyat?${next.toString()}`;
  };

  return (
    <div className="inv-page">
      <p className="order-back"><Link href="/admin/urunler">‹ Ürünler</Link></p>
      <div className="admin-top">
        <h1>Toplu fiyat güncelleme</h1>
      </div>
      <form className="panel-admin inv-filters" method="get">
        <label className="field">Ara<input name="q" defaultValue={query.q ?? ""} placeholder="Ürün, SKU veya barkod" /></label>
        <label className="field">Kategori
          <select name="category" defaultValue={query.category ?? ""}>
            <option value="">Tümü</option>
            {categoryOptions(categories).map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
          </select>
        </label>
        <label className="field">Durum
          <select name="status" defaultValue={query.status ?? ""}>
            {PRODUCT_STATUS_FILTERS.map((item) => <option key={item.value || "all"} value={item.value}>{item.label}</option>)}
            <option value="VARIANT_OFF">Varyantı kapalı</option>
          </select>
        </label>
        <button className="green-btn" type="submit">Filtrele</button>
      </form>
      <BulkPriceManager
        key={`${params.toString()}|${page}`}
        rows={body.data}
        canEdit={body.meta.canEditPrice}
        filter={{ q: query.q || undefined, category: query.category || undefined, status: query.status || undefined }}
        pager={{ page, pages, total: body.meta.total, prevHref: page > 1 ? hrefFor(page - 1) : null, nextHref: page < pages ? hrefFor(page + 1) : null }}
      />
    </div>
  );
}
