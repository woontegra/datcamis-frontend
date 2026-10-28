import type { Metadata } from "next";
import { ProfileForm } from "@/components/account/ProfileForms";
import type { Customer } from "@/lib/account";
import { customerApi } from "@/lib/account-server";

export const metadata: Metadata = { title: "Profil bilgileri" };

export default async function AccountProfile() {
  const me = await customerApi<{ data: Customer }>("/account/me", "/hesap/profil");
  return <ProfileForm initial={me.data} />;
}
