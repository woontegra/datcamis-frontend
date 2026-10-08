import { CartProvider } from "@/components/store/cart-context";
import { StoreFrame } from "@/components/store/StoreFrame";
import { getMenu, getSettings } from "@/lib/store";

export default async function StoreLayout({ children }: { children: React.ReactNode }) {
  const [items, settings] = await Promise.all([getMenu(), getSettings()]);
  const notice = typeof settings.pricingNotice === "string" ? settings.pricingNotice : "";
  return (
    <CartProvider>
      <div className="store-shell">
        <StoreFrame items={items} notice={notice}>
          {children}
        </StoreFrame>
      </div>
    </CartProvider>
  );
}
