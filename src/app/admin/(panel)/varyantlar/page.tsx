import { AttributeManager, type AdminAttribute } from "@/components/admin/attributes/AttributeManager";
import { ApiError } from "@/lib/api";
import { adminApi } from "@/lib/admin";

export default async function VariantOptionsAdmin() {
  let body: { data: AdminAttribute[]; meta: { canEdit: boolean } };
  try {
    body = await adminApi("/admin/attributes");
  } catch (error) {
    if (error instanceof ApiError && error.status === 403) {
      return <section className="panel-admin"><p>Bu sayfayı görme yetkiniz yok.</p></section>;
    }
    throw error;
  }
  return <AttributeManager initial={body.data} canEdit={body.meta.canEdit} />;
}
