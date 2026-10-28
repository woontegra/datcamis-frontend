import { CartProvider } from "@/components/store/cart-context";
import { CustomerProvider } from "@/components/store/customer-context";
import { MaintenancePage } from "@/components/store/MaintenancePage";
import { SiteSettingsProvider } from "@/components/store/site-settings-context";
import { StoreFrame } from "@/components/store/StoreFrame";
import { hasStaffSession } from "@/lib/admin";
import { getMenus, getPublishedHome, getSettings } from "@/lib/store";

export default async function StoreLayout({ children }: { children: React.ReactNode }) {
  const [menus, settings, published] = await Promise.all([getMenus(), getSettings(), getPublishedHome()]);
  const maintenance = settings.maintenance.enabled;
  if (maintenance && !(await hasStaffSession())) {
    return (
      <SiteSettingsProvider value={settings}>
        <MaintenancePage />
      </SiteSettingsProvider>
    );
  }
  const notice = settings.announcement.enabled ? settings.announcement.text : "";
  return (
    <SiteSettingsProvider value={settings}>
      <CustomerProvider>
        <CartProvider>
          <div className="store-shell">
            {maintenance ? (
              <p className="notice notice-maintenance" role="status">
                Bakım modu açık: ziyaretçiler “Yakında açılıyoruz” sayfasını görüyor. Siz yönetici olarak mağazayı görüyorsunuz.
              </p>
            ) : null}
            <StoreFrame menus={menus} notice={notice} published={published}>
              {children}
            </StoreFrame>
          </div>
        </CartProvider>
      </CustomerProvider>
    </SiteSettingsProvider>
  );
}
