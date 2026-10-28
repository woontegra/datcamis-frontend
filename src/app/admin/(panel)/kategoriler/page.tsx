import { CategoryManager, type AdminCategory } from "@/components/admin/taxonomy/CategoryManager";
import { adminApi } from "@/lib/admin";

export default async function CategoriesAdmin() {
  const body = await adminApi<{ data: AdminCategory[]; meta: { canEdit: boolean; maxDepth: number } }>("/admin/categories");
  return <CategoryManager initial={body.data} canEdit={body.meta.canEdit} maxDepth={body.meta.maxDepth} />;
}
