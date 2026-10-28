import HomePage from "@/app/(store)/page";
import { EditorShell } from "@/components/editor/EditorShell";
import { CartProvider } from "@/components/store/cart-context";
import { SiteSettingsProvider } from "@/components/store/site-settings-context";
import { StoreFrame } from "@/components/store/StoreFrame";
import { adminApi } from "@/lib/admin";
import { getMenus, getSettings } from "@/lib/store";
import "./editor.css";

export default async function VisualEditorPage() {
  await adminApi<{ data: { id: string }[] }>("/admin/pages");
  const [menus, settings] = await Promise.all([getMenus(), getSettings()]);
  const notice = settings.announcement.enabled ? settings.announcement.text : "";
  return (
    <SiteSettingsProvider value={settings}>
      <CartProvider>
        <EditorShell>
          <StoreFrame menus={menus} notice={notice} home>
            <HomePage />
          </StoreFrame>
        </EditorShell>
      </CartProvider>
    </SiteSettingsProvider>
  );
}
