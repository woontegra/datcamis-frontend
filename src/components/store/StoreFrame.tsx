"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import type { EditorDraft } from "@/lib/editor-elements";
import type { StoreMenus } from "@/lib/types";
import { Footer } from "./Footer";
import { Header } from "./Header";
import { HomeGarden } from "./HomeGarden";
import { HomePublished } from "./HomePublished";

export function StoreFrame({
  menus,
  notice,
  children,
  home,
  published,
}: {
  menus: StoreMenus;
  notice: string;
  children: React.ReactNode;
  home?: boolean;
  published?: EditorDraft | null;
}) {
  const pathHome = usePathname() === "/";
  const isHome = home ?? pathHome;
  const [root, setRoot] = useState<HTMLDivElement | null>(null);
  return (
    <div ref={setRoot} className={isHome ? "store-main is-home" : "store-main"} data-editor-id="frame">
      {isHome ? <HomeGarden /> : null}
      <Header items={menus.header} />
      {notice ? <p className="notice" data-editor-id="frame.notice">{notice}</p> : null}
      <main data-editor-id="frame.main">{children}</main>
      <Footer columns={menus.footer} />
      {published && root ? <HomePublished root={root} draft={published} /> : null}
    </div>
  );
}
