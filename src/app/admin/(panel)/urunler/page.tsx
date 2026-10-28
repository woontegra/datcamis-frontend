import Link from "next/link";
import { ApiError } from "@/lib/api";
import { adminApi } from "@/lib/admin";
import { PRODUCT_STATUS_FILTERS, type AdminProductListItem } from "@/lib/products";
import { ProductTable } from "./ProductTable";

export default async function ProductsAdmin({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; category?: string; stock?: string; page?: string; sort?: string }>;
}) {
  const query = await searchParams;
  const params = new URLSearchParams();
  if (query.q) params.set("q", query.q);
  if (query.status) params.set("status", query.status);
  if (query.category) params.set("category", query.category);
  if (query.stock) params.set("stock", query.stock);
  if (query.sort) params.set("sort", query.sort);
  params.set("page", String(Math.max(1, Number(query.page) || 1)));
  params.set("pageSize", "20");
  let body: { data: AdminProductListItem[]; meta: { page: number; pageSize: number; total: number; canEdit: boolean; canArchive: boolean } };
  try {
    body = await adminApi(`/admin/products?${params.toString()}`);
  } catch (error) {
    if (error instanceof ApiError && error.status === 403) {
      return <section className="panel-admin"><p>Bu sayfayı görme yetkiniz yok.</p></section>;
    }
    throw error;
  }
  const pages = Math.max(1, Math.ceil(body.meta.total / body.meta.pageSize));
  return (
    <>
      <div className="admin-top">
        <h1>Ürünler</h1>
        {body.meta.canEdit ? <Link className="green-btn" href="/admin/urunler/yeni">Yeni ürün</Link> : null}
      </div>
      <form className="panel-admin order-filters" method="get">
        <label className="field">Ara<input name="q" defaultValue={query.q ?? ""} placeholder="Ad veya SKU" /></label>
        <label className="field">Durum
          <select name="status" defaultValue={query.status ?? ""}>
            {PRODUCT_STATUS_FILTERS.map((item) => <option key={item.value || "all"} value={item.value}>{item.label}</option>)}
          </select>
        </label>
        <label className="field">Stok
          <select name="stock" defaultValue={query.stock ?? ""}>
            <option value="">Tümü</option>
            <option value="out">Stokta yok</option>
            <option value="low">Kritik stok</option>
          </select>
        </label>
        <label className="field">Sıra
          <select name="sort" defaultValue={query.sort ?? "name"}>
            <option value="name">Ad</option>
            <option value="newest">Yeni</option>
            <option value="price">Fiyat</option>
            <option value="stock">Stok</option>
          </select>
        </label>
        <button className="green-btn" type="submit">Filtrele</button>
      </form>
      <section className="panel-admin" style={{ marginTop: "0.7rem" }}>
        {body.data.length === 0 ? <p>Kayıt yok.</p> : <ProductTable rows={body.data} canArchive={body.meta.canArchive} canEdit={body.meta.canEdit} />}
        <p className="order-pager">{body.meta.page} / {pages} · {body.meta.total} ürün</p>
      </section>
    </>
  );
}
