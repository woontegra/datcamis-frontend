"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { adminNav } from "./nav";

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  return (
    <div className="admin-shell">
      {open ? <button className="backdrop" aria-label="Menüyü kapat" onClick={() => setOpen(false)} /> : null}
      <aside className={`admin-sidebar ${open ? "is-open" : ""}`}>
        <div className="admin-brand">DatçaMis</div>
        <nav className="admin-nav" aria-label="Yönetim">
          {adminNav.map(([label, href]) => (
            <Link key={href} href={href} aria-current={pathname === href ? "page" : undefined} onClick={() => setOpen(false)}>
              {label}
            </Link>
          ))}
        </nav>
      </aside>
      <div className="admin-content">
        <button className="text-btn menu-admin" type="button" onClick={() => setOpen(true)}>Menü</button>
        {children}
      </div>
    </div>
  );
}
