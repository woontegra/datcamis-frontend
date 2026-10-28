import { AdminShell } from "@/components/admin/AdminShell";
import { adminApi } from "@/lib/admin";
import type { StaffRole } from "@/components/admin/nav";

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const body = await adminApi<{ data: { role: StaffRole } }>("/admin/auth/me");
  return <AdminShell role={body.data.role}>{children}</AdminShell>;
}
