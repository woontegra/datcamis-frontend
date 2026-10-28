import type { Metadata } from "next";
import { AddressBook } from "@/components/account/AddressBook";
import type { Customer, SavedAddress } from "@/lib/account";
import { customerApi } from "@/lib/account-server";

export const metadata: Metadata = { title: "Adreslerim" };

export default async function AccountAddresses() {
  const [me, addresses] = await Promise.all([
    customerApi<{ data: Customer }>("/account/me", "/hesap/adresler"),
    customerApi<{ data: SavedAddress[] }>("/account/addresses", "/hesap/adresler"),
  ]);
  return <AddressBook initial={addresses.data} customer={me.data} />;
}
