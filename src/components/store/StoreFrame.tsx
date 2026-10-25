"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import type { EditorDraft } from "@/lib/editor-elements";
import type { MenuItem } from "@/lib/types";
import { Footer } from "./Footer";
import { Header } from "./Header";
import { HomeGarden } from "./HomeGarden";
import { HomePublished } from "./HomePublished";

export function StoreFrame({
  items,
  notice,
  children,
  home,
  published,
}: {
  items: MenuItem[];
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
      <Header items={items} />
      {notice ? <p className="notice" data-editor-id="frame.notice">{notice}</p> : null}
      <main data-editor-id="frame.main">{children}</main>
      <Footer />
      {published && root ? <HomePublished root={root} draft={published} /> : null}
    </div>
  );
}
