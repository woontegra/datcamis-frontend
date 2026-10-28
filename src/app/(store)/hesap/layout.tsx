import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AccountNav } from "@/components/account/AccountNav";
import { safeNext } from "@/lib/account";
import { currentCustomer } from "@/lib/account-server";

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const customer = await currentCustomer();
  if (!customer) {
    const next = safeNext((await headers()).get("x-dm-path"));
    redirect(`/giris?next=${encodeURIComponent(next)}`);
  }
  return (
    <div className="wrap section account-page">
      <p className="eyebrow">Hesabım</p>
      <h1>Merhaba, {customer.firstName}</h1>
      <div className="account-layout">
        <AccountNav />
        <div className="account-main">{children}</div>
      </div>
    </div>
  );
}
