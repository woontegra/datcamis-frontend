import { CartProvider } from "@/components/store/cart-context";
import { CustomerProvider } from "@/components/store/customer-context";
import { StoreFrame } from "@/components/store/StoreFrame";
import { getMenu, getPublishedHome, getSettings } from "@/lib/store";

export default async function StoreLayout({ children }: { children: React.ReactNode }) {
  const [items, settings, published] = await Promise.all([getMenu(), getSettings(), getPublishedHome()]);
  const notice = typeof settings.pricingNotice === "string" ? settings.pricingNotice : "";
  return (
    <CustomerProvider>
      <CartProvider>
        <div className="store-shell">
          <StoreFrame items={items} notice={notice} published={published}>
            {children}
          </StoreFrame>
        </div>
      </CartProvider>
    </CustomerProvider>
  );
}
