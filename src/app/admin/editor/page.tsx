import HomePage from "@/app/(store)/page";
import { EditorShell } from "@/components/editor/EditorShell";
import { CartProvider } from "@/components/store/cart-context";
import { StoreFrame } from "@/components/store/StoreFrame";
import { adminApi } from "@/lib/admin";
import { getMenu, getSettings } from "@/lib/store";
import "./editor.css";

export default async function VisualEditorPage() {
  await adminApi<{ data: { id: string }[] }>("/admin/pages");
  const [items, settings] = await Promise.all([getMenu(), getSettings()]);
  const notice = typeof settings.pricingNotice === "string" ? settings.pricingNotice : "";
  return (
    <CartProvider>
      <EditorShell>
        <StoreFrame items={items} notice={notice} home>
          <HomePage />
        </StoreFrame>
      </EditorShell>
    </CartProvider>
  );
}
