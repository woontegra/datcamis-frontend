"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import type { MenuItem } from "@/lib/types";
import { useCart } from "./cart-context";

function isCurrent(href: string, path: string) {
  if (href === "/") return path === "/";
  return path === href || path.startsWith(`${href}/`);
}

export function Header({ items }: { items: MenuItem[] }) {
  const [open, setOpen] = useState(false);
  const { count } = useCart();
  const path = usePathname();
  return (
    <header className={`site-header ${open ? "is-open" : ""}`}>
      <div className="wrap header-bar">
        <Link href="/" className="brand-lockup" onClick={() => setOpen(false)}>
          <img src="/home/logo-mark.jpg" alt="" width={48} height={48} />
          <span>
            <strong className="brand-name">DATÇAMİS</strong>
            <small className="brand-tag">Datça’dan Teninize Doğadan Ruhunuza</small>
          </span>
        </Link>
        <nav className="desktop-nav" aria-label="Ana menü">
          {items.map((item) => (
            <Link key={item.href} href={item.href} aria-current={isCurrent(item.href, path) ? "page" : undefined}>
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="header-tools">
          <Link className="icon-btn tool-extra" href="/arama" aria-label="Arama">
            <IconSearch />
          </Link>
          <Link className="icon-btn tool-extra" href="/hesap" aria-label="Hesap">
            <IconUser />
          </Link>
          <Link className="icon-btn tool-extra" href="/favoriler" aria-label="Favoriler">
            <IconHeart />
          </Link>
          <Link className="icon-btn" href="/sepet" aria-label={`Sepet, ${count} ürün`}>
            <IconBag />
            {count > 0 ? <span className="count-dot">{count}</span> : null}
          </Link>
          <button className="icon-btn menu-toggle" type="button" aria-expanded={open} aria-label="Menü" onClick={() => setOpen((value) => !value)}>
            <IconMenu />
          </button>
        </div>
      </div>
      {open ? (
        <div className="wrap mobile-drawer">
          {items.map((item) => (
            <Link key={item.href} href={item.href} aria-current={isCurrent(item.href, path) ? "page" : undefined} onClick={() => setOpen(false)}>
              {item.label}
            </Link>
          ))}
          <Link href="/arama" onClick={() => setOpen(false)}>Arama</Link>
          <Link href="/hesap" onClick={() => setOpen(false)}>Hesap</Link>
          <Link href="/favoriler" onClick={() => setOpen(false)}>Favoriler</Link>
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
