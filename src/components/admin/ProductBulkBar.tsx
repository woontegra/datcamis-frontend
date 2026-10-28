"use client";

import { useRouter } from "next/navigation";
import { browserApi } from "@/lib/api";

export function ProductBulkBar({ ids, canArchive }: { ids: string[]; canArchive: boolean }) {
  const router = useRouter();
  if (ids.length === 0) return null;

  async function apply(status: "ACTIVE" | "DISABLED" | "ARCHIVED") {
    await browserApi("/admin/products/bulk", { method: "POST", body: JSON.stringify({ ids, status }) });
    router.refresh();
  }

  return (
    <div className="order-actions" style={{ marginBottom: "0.6rem" }}>
      <span>{ids.length} ürün seçildi</span>
      <button type="button" className="green-btn" onClick={() => void apply("ACTIVE")}>Yayına al</button>
      <button type="button" className="text-btn" onClick={() => void apply("DISABLED")}>Pasife al</button>
      {canArchive ? <button type="button" className="text-btn" onClick={() => void apply("ARCHIVED")}>Arşivle</button> : null}
    </div>
  );
}
