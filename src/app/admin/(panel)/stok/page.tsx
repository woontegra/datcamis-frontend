import { StockManager, type StockPayload } from "@/components/admin/inventory/StockManager";
import { ApiError } from "@/lib/api";
import { adminApi } from "@/lib/admin";
import { categoryOptions, type CategoryOption } from "@/lib/category-options";

export default async function StockAdmin() {
  let body: StockPayload;
  let categories: CategoryOption[];
  try {
    [body, { data: categories }] = await Promise.all([
      adminApi<StockPayload>("/admin/stock?page=1&pageSize=50"),
      adminApi<{ data: CategoryOption[] }>("/admin/categories"),
    ]);
  } catch (error) {
    if (error instanceof ApiError && error.status === 403) {
      return <section className="panel-admin"><p>Bu sayfayı görme yetkiniz yok.</p></section>;
    }
    throw error;
  }
  return <StockManager initial={body} categories={categoryOptions(categories)} />;
}
