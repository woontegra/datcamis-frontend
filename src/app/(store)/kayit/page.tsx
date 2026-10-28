import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { RegisterForm } from "@/components/account/AuthForms";
import { safeNext } from "@/lib/account";
import { currentCustomer } from "@/lib/account-server";

export const metadata: Metadata = { title: "Hesap oluştur" };

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  if (await currentCustomer()) redirect(safeNext(next));
  return (
    <div className="wrap section auth-page">
      <p className="eyebrow">Hesabım</p>
      <h1>Hesap oluştur</h1>
      <RegisterForm next={next ? safeNext(next) : undefined} />
    </div>
  );
}
