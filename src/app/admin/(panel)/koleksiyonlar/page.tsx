import { CollectionManager, type AdminCollection } from "@/components/admin/taxonomy/CollectionManager";
import { adminApi } from "@/lib/admin";

export default async function CollectionsAdmin() {
  const [collections, categories] = await Promise.all([
    adminApi<{ data: AdminCollection[]; meta: { canEdit: boolean } }>("/admin/collections"),
    adminApi<{ data: Array<{ id: string; name: string; parentId: string | null }> }>("/admin/categories"),
  ]);
  return <CollectionManager initial={collections.data} canEdit={collections.meta.canEdit} categories={categories.data} />;
}
