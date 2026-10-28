"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { NavIcon } from "./NavIcon";
import {
  groupIdForPath,
  navItemActive,
  visibleNavGroups,
  type StaffRole,
} from "./nav";

const STORAGE_KEY = "datcamis-admin-nav-groups";

function readStored(): Record<string, boolean> {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return {};
    return parsed as Record<string, boolean>;
  } catch {
    return {};
  }
}

export function AdminShell({ role, children }: { role: StaffRole; children: React.ReactNode }) {
  const pathname = usePathname();
  const groups = useMemo(() => visibleNavGroups(role), [role]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [ready, setReady] = useState(false);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    const current = groupIdForPath(pathname, groups);
    return current ? { [current]: true } : {};
  });

  useEffect(() => {
    const stored = readStored();
    const current = groupIdForPath(pathname, groups);
    setOpenGroups((previous) => {
      const base = ready ? previous : { ...stored, ...previous };
      return current ? { ...base, [current]: true } : base;
    });
    setReady(true);
  }, [groups, pathname, ready]);

  useEffect(() => {
    if (!ready) return;
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(openGroups));
  }, [openGroups, ready]);

  function toggleGroup(id: string) {
    setOpenGroups((current) => ({ ...current, [id]: !current[id] }));
  }

  return (
    <div className="admin-shell">
      {drawerOpen ? <button className="backdrop" aria-label="Menüyü kapat" type="button" onClick={() => setDrawerOpen(false)} /> : null}
      <aside className={`admin-sidebar ${drawerOpen ? "is-open" : ""}`}>
        <div className="admin-brand">DatçaMis</div>
        <nav className="admin-nav" aria-label="Yönetim">
          {groups.map((group) => {
            const expanded = Boolean(openGroups[group.id]);
            return (
              <div className="admin-nav-group" key={group.id}>
                <button
                  type="button"
                  className="admin-nav-group-toggle"
                  aria-expanded={expanded}
                  onClick={() => toggleGroup(group.id)}
                >
                  <span>{group.label}</span>
                  <span className="admin-nav-caret" aria-hidden="true">{expanded ? "▾" : "▸"}</span>
                </button>
                {expanded ? (
                  <div className="admin-nav-items">
                    {group.items.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        className="admin-nav-link"
                        aria-current={navItemActive(pathname, item.href) ? "page" : undefined}
                        onClick={() => setDrawerOpen(false)}
                      >
                        <NavIcon name={item.icon} />
                        {item.label}
                      </Link>
                    ))}
                  </div>
                ) : null}
              </div>
            );
          })}
        </nav>
      </aside>
      <div className="admin-content">
        <button className="text-btn menu-admin" type="button" onClick={() => setDrawerOpen(true)}>Menü</button>
        {children}
      </div>
    </div>
  );
}
