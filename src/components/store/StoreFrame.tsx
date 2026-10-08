"use client";

import { usePathname } from "next/navigation";
import type { MenuItem } from "@/lib/types";
import { Footer } from "./Footer";
import { Header } from "./Header";
import { HomeGarden } from "./HomeGarden";

export function StoreFrame({ items, notice, children }: { items: MenuItem[]; notice: string; children: React.ReactNode }) {
  const home = usePathname() === "/";
  return (
    <div className={home ? "store-main is-home" : "store-main"}>
      {home ? <HomeGarden /> : null}
      <Header items={items} />
      {notice ? <p className="notice">{notice}</p> : null}
      <main>{children}</main>
      <Footer />
    </div>
  );
}
