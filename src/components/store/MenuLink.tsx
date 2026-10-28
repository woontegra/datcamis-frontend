import Link from "next/link";
import type { MenuItem } from "@/lib/types";

type Props = {
  item: MenuItem;
  editorId?: string;
  current?: boolean;
  className?: string;
  onClick?: () => void;
};

export function MenuLink({ item, editorId, current, className, onClick }: Props) {
  const tab = item.newTab ? { target: "_blank", rel: "noopener noreferrer" } : {};
  const common = { className, "data-editor-id": editorId, "aria-current": current ? ("page" as const) : undefined, onClick, ...tab };
  if (item.href.startsWith("/") && !item.href.startsWith("//")) {
    return <Link href={item.href} {...common}>{item.label}</Link>;
  }
  return <a href={item.href} {...common}>{item.label}</a>;
}
