"use client";

import { useState } from "react";
import Link from "next/link";
import { formatTry } from "@/lib/money";
import { PRODUCT_STATUS_LABEL, type AdminProductListItem } from "@/lib/products";
import { ProductBulkBar } from "@/components/admin/ProductBulkBar";

export function ProductTable({ rows, canArchive, canEdit }: { rows: AdminProductListItem[]; canArchive: boolean; canEdit: boolean }) {
  const [selected, setSelected] = useState<string[]>([]);

  function toggle(id: string) {
    setSelected((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  }

  return (
    <>
      {canEdit ? <ProductBulkBar ids={selected} canArchive={canArchive} /> : null}
      <div className="table-scroll only-desktop">
        <table>
          <thead>
            <tr>
              {canEdit ? <th></th> : null}
              <th>Görsel</th>
              <th>Ürün</th>
              <th>Kategori</th>
              <th>Varyant</th>
              <th>Fiyat</th>
              <th>Stok</th>
              <th>Durum</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className={row.stockFlag === "low" || row.stockFlag === "out" ? "product-row-alert" : undefined}>
                {canEdit ? (
                  <td><input type="checkbox" checked={selected.includes(row.id)} onChange={() => toggle(row.id)} /></td>
                ) : null}
                <td>{row.image ? <img className="product-list-thumb" src={row.image.url} alt={row.image.alt} /> : "—"}</td>
                <td><Link href={`/admin/urunler/${row.id}`}>{row.name}</Link></td>
                <td>{row.categoryName || "—"}</td>
                <td>{row.variantCount}</td>
                <td>{row.priceMin === row.priceMax ? formatTry(row.priceMin) : `${formatTry(row.priceMin)} – ${formatTry(row.priceMax)}`}</td>
                <td>{row.totalStock}{row.stockFlag === "out" ? " · yok" : row.stockFlag === "low" ? " · kritik" : ""}</td>
                <td>{PRODUCT_STATUS_LABEL[row.status] ?? row.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="only-mobile">
        {rows.map((row) => (
          <article className={`admin-card${row.stockFlag !== "ok" ? " product-row-alert" : ""}`} key={row.id}>
            {canEdit ? <input type="checkbox" checked={selected.includes(row.id)} onChange={() => toggle(row.id)} /> : null}
            {row.image ? <img className="product-list-thumb" src={row.image.url} alt={row.image.alt} /> : null}
            <p style={{ margin: 0 }}><Link href={`/admin/urunler/${row.id}`}><strong>{row.name}</strong></Link></p>
            <p style={{ margin: 0 }}>{row.categoryName || "—"} · {row.variantCount} varyant</p>
            <p style={{ margin: 0 }}>{formatTry(row.priceMin)} · stok {row.totalStock} · {PRODUCT_STATUS_LABEL[row.status]}</p>
          </article>
        ))}
      </div>
    </>
  );
}
