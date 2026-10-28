import type { Metadata } from "next";
import { PasswordForm } from "@/components/account/ProfileForms";
import { customerApi } from "@/lib/account-server";

export const metadata: Metadata = { title: "Şifre değiştir" };

export default async function AccountPassword() {
  await customerApi("/account/me", "/hesap/sifre");
  return <PasswordForm />;
}
