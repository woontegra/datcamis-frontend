import { adminApi } from "@/lib/admin";
import { StoreSettingsForm } from "@/components/admin/StoreSettingsForm";
import { FALLBACK_BRAND } from "@/lib/brand";
import type { SettingsInfo, StoreSettings } from "@/lib/settings-form";

export default async function SettingsPage() {
  const me = await adminApi<{ data: { role: string } }>("/admin/auth/me");
  if (me.data.role !== "OWNER" && me.data.role !== "ADMIN") {
    return (
      <>
        <div className="admin-top"><h1>Ayarlar</h1></div>
        <section className="panel-admin"><p>Ayarları yalnızca Owner ve Admin görebilir ve düzenleyebilir.</p></section>
      </>
    );
  }
  const body = await adminApi<{ data: { settings: StoreSettings; info: SettingsInfo } }>("/admin/settings");
  return <StoreSettingsForm initial={body.data.settings} info={body.data.info} fallbackSlogan={FALLBACK_BRAND.slogan} />;
}
