import { MenuManager, type MenuDetail, type MenuMeta, type MenuSummary } from "@/components/admin/menus/MenuManager";
import { adminApi } from "@/lib/admin";

export default async function MenusAdmin() {
  const list = await adminApi<{ data: MenuSummary[]; meta: MenuMeta }>("/admin/menus");
  const first = list.data.find((menu) => menu.location === "HEADER") ?? list.data[0];
  const detail = first ? await adminApi<{ data: MenuDetail }>(`/admin/menus/${first.id}`) : null;
  return <MenuManager initialMenus={list.data} initialMenu={detail?.data ?? null} meta={list.meta} />;
}
