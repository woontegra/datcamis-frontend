import { ApiError } from "@/lib/api";
import { adminApi } from "@/lib/admin";
import { HavaleSettingsForm, type HavaleSettings } from "@/components/admin/HavaleSettingsForm";

export default async function SettingsPage() {
  const me = await adminApi<{ data: { role: string } }>("/admin/auth/me");
  if (me.data.role !== "OWNER" && me.data.role !== "ADMIN") {
    return (
      <>
        <div className="admin-top"><h1>Ayarlar</h1></div>
        <section className="panel-admin"><p>Havale ayarlarını yalnızca Owner ve Admin düzenleyebilir.</p></section>
      </>
    );
  }
  let initial: HavaleSettings = { enabled: false, bankName: "", accountHolder: "", iban: "", note: "" };
  try {
    const body = await adminApi<{ data: HavaleSettings }>("/admin/settings/havale");
    initial = body.data;
  } catch (error) {
    if (!(error instanceof ApiError && error.status === 404)) throw error;
  }
  return (
    <>
      <div className="admin-top"><h1>Ayarlar</h1></div>
      <HavaleSettingsForm initial={initial} />
    </>
  );
}
