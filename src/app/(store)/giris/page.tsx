import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/account/AuthForms";
import { safeNext } from "@/lib/account";
import { currentCustomer } from "@/lib/account-server";

export const metadata: Metadata = { title: "Giriş yap" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  if (await currentCustomer()) redirect(safeNext(next));
  return (
    <div className="wrap section auth-page">
      <p className="eyebrow">Hesabım</p>
      <h1>Giriş yap</h1>
      <LoginForm next={next ? safeNext(next) : undefined} />
    </div>
  );
}
