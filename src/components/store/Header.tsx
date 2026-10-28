"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { editorMenuId } from "@/lib/editor-catalog";
import type { MenuItem } from "@/lib/types";
import { useCart } from "./cart-context";
import { MenuLink } from "./MenuLink";
import { useCustomer } from "./customer-context";
import { useBrand } from "./site-settings-context";

function isCurrent(href: string, path: string) {
  if (href === "/") return path === "/";
  return path === href || path.startsWith(`${href}/`);
}

export function Header({ items }: { items: MenuItem[] }) {
  const [open, setOpen] = useState(false);
  const [openGroup, setOpenGroup] = useState<number | null>(null);
  const { count } = useCart();
  const { customer, ready } = useCustomer();
  const brand = useBrand();
  const path = usePathname();
  const accountHref = !ready || customer ? "/hesap" : "/giris";
  const accountLabel = !ready ? "Hesap" : customer ? "Hesabım" : "Giriş yap";
  return (
    <header className={`site-header ${open ? "is-open" : ""}`} data-editor-id="frame.header">
      <div className="wrap header-bar">
        <Link href="/" className="brand-lockup" data-editor-id="frame.header.brand" onClick={() => setOpen(false)}>
          <img src={brand.logo} alt="" width={48} height={48} data-editor-id="frame.header.brand.mark" />
          <span>
            <strong className="brand-name" data-editor-id="frame.header.brand.name">{brand.name}</strong>
            {brand.slogan ? <small className="brand-tag" data-editor-id="frame.header.brand.tag">{brand.slogan}</small> : null}
          </span>
        </Link>
        <nav className="desktop-nav" aria-label="Ana menü" data-editor-id="frame.header.nav">
          {items.map((item, index) => {
            const link = <MenuLink key={`${item.href}-${index}`} item={item} editorId={editorMenuId("frame.header.nav", item.href)} current={isCurrent(item.href, path)} />;
            if (!item.children?.length) return link;
            return (
              <div key={`${item.href}-${index}`} className="nav-drop">
                {link}
                <div className="nav-sub">
                  {item.children.map((child, at) => (
                    <MenuLink key={`${child.href}-${at}`} item={child} editorId={editorMenuId("frame.header.nav", child.href)} current={isCurrent(child.href, path)} />
                  ))}
                </div>
              </div>
            );
          })}
        </nav>
        <div className="header-tools" data-editor-id="frame.header.tools">
          <Link className="icon-btn tool-extra" href="/arama" aria-label="Arama" data-editor-id="frame.header.tools.search">
            <IconSearch />
          </Link>
          <Link className="icon-btn tool-extra" href={accountHref} aria-label={accountLabel} aria-busy={!ready || undefined} data-editor-id="frame.header.tools.account">
            <IconUser />
          </Link>
          <Link className="icon-btn tool-extra" href="/favoriler" aria-label="Favoriler" data-editor-id="frame.header.tools.favorites">
            <IconHeart />
          </Link>
          <Link className="icon-btn" href="/sepet" aria-label={`Sepet, ${count} ürün`} data-editor-id="frame.header.tools.cart">
            <IconBag />
            {count > 0 ? <span className="count-dot">{count}</span> : null}
          </Link>
          <button className="icon-btn menu-toggle" type="button" aria-expanded={open} aria-label="Menü" data-editor-id="frame.header.tools.menu" onClick={() => setOpen((value) => !value)}>
            <IconMenu />
          </button>
        </div>
      </div>
      {open ? (
        <div className="wrap mobile-drawer" data-editor-id="frame.header.drawer">
          {items.map((item, index) => {
            const close = () => setOpen(false);
            if (!item.children?.length) {
              return <MenuLink key={`${item.href}-${index}`} item={item} editorId={editorMenuId("frame.header.drawer", item.href)} current={isCurrent(item.href, path)} onClick={close} />;
            }
            const expanded = openGroup === index;
            return (
              <div key={`${item.href}-${index}`} className="drawer-group">
                <button type="button" className="drawer-parent" aria-expanded={expanded} data-editor-id={editorMenuId("frame.header.drawer", item.href)} onClick={() => setOpenGroup(expanded ? null : index)}>
                  <span>{item.label}</span>
                  <span className="drawer-chevron" aria-hidden="true" />
                </button>
                {expanded ? (
                  <div className="drawer-sub">
                    <MenuLink item={{ ...item, label: "Tümünü gör" }} current={path === item.href} onClick={close} />
                    {item.children.map((child, at) => (
                      <MenuLink key={`${child.href}-${at}`} item={child} current={isCurrent(child.href, path)} onClick={close} />
                    ))}
                  </div>
                ) : null}
              </div>
            );
          })}
          <Link href="/arama" data-editor-id="frame.header.drawer.arama" onClick={() => setOpen(false)}>Arama</Link>
          <Link href={accountHref} data-editor-id="frame.header.drawer.hesap" onClick={() => setOpen(false)}>{accountLabel}</Link>
          <Link href="/favoriler" data-editor-id="frame.header.drawer.favoriler" onClick={() => setOpen(false)}>Favoriler</Link>
        </div>
      ) : null}
    </header>
  );
}

function Icon({ children }: { children: React.ReactNode }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
      {children}
    </svg>
  );
}
function IconSearch() {
  return <Icon><circle cx="11" cy="11" r="6" /><path d="M16 16l5 5" /></Icon>;
}
function IconUser() {
  return <Icon><circle cx="12" cy="8" r="3" /><path d="M5 19c1.5-3 4-4.5 7-4.5S17.5 16 19 19" /></Icon>;
}
function IconHeart() {
  return <Icon><path d="M12 19s-7-4.4-7-9a4 4 0 0 1 7-2 4 4 0 0 1 7 2c0 4.6-7 9-7 9z" /></Icon>;
}
function IconBag() {
  return <Icon><path d="M6 8h12l-1 12H7L6 8z" /><path d="M9 8V7a3 3 0 0 1 6 0v1" /></Icon>;
}
function IconMenu() {
  return <Icon><path d="M4 7h16M4 12h16M4 17h16" /></Icon>;
}
