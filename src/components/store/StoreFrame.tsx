"use client";

import { usePathname } from "next/navigation";
import type { MenuItem } from "@/lib/types";
import { Footer } from "./Footer";
import { Header } from "./Header";
import { HomeGarden } from "./HomeGarden";

export function StoreFrame({ items, notice, children, home }: { items: MenuItem[]; notice: string; children: React.ReactNode; home?: boolean }) {
  const pathHome = usePathname() === "/";
  const isHome = home ?? pathHome;
  return (
    <div className={isHome ? "store-main is-home" : "store-main"} data-editor-id="frame">
      {isHome ? <HomeGarden /> : null}
      <Header items={items} />
      {notice ? <p className="notice" data-editor-id="frame.notice">{notice}</p> : null}
      <main data-editor-id="frame.main">{children}</main>
      <Footer />
    </div>
  );
}
