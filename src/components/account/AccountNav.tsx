"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCustomer } from "@/components/store/customer-context";

const ITEMS = [
  { href: "/hesap", label: "Genel bakış", icon: "grid" },
  { href: "/hesap/siparisler", label: "Siparişlerim", icon: "box" },
  { href: "/hesap/adresler", label: "Adreslerim", icon: "pin" },
  { href: "/hesap/favoriler", label: "Favorilerim", icon: "heart" },
  { href: "/hesap/profil", label: "Profil bilgileri", icon: "user" },
  { href: "/hesap/sifre", label: "Şifre değiştir", icon: "lock" },
] as const;

function isActive(href: string, path: string) {
  if (href === "/hesap") return path === "/hesap";
  return path === href || path.startsWith(`${href}/`);
}

export function AccountIcon({ name }: { name: string }) {
  const paths: Record<string, React.ReactNode> = {
    grid: <><rect x="4" y="4" width="6" height="6" rx="1.2" /><rect x="14" y="4" width="6" height="6" rx="1.2" /><rect x="4" y="14" width="6" height="6" rx="1.2" /><rect x="14" y="14" width="6" height="6" rx="1.2" /></>,
    box: <><path d="M4 8l8-4 8 4v8l-8 4-8-4V8z" /><path d="M4 8l8 4 8-4M12 12v8" /></>,
    pin: <><path d="M12 21s-6-5.4-6-10a6 6 0 0 1 12 0c0 4.6-6 10-6 10z" /><circle cx="12" cy="11" r="2.2" /></>,
    heart: <path d="M12 19s-7-4.4-7-9a4 4 0 0 1 7-2 4 4 0 0 1 7 2c0 4.6-7 9-7 9z" />,
    user: <><circle cx="12" cy="8" r="3.2" /><path d="M5 20c1.4-3.2 4-4.8 7-4.8s5.6 1.6 7 4.8" /></>,
    lock: <><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></>,
    logout: <><path d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4" /><path d="M10 16l-4-4 4-4M6 12h10" /></>,
    truck: <><path d="M3 7h11v9H3zM14 10h4l3 3v3h-7" /><circle cx="7" cy="17.5" r="1.6" /><circle cx="17" cy="17.5" r="1.6" /></>,
  };
  return (
    <svg className="account-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {paths[name]}
    </svg>
  );
}

export function AccountNav() {
  const path = usePathname();
  const router = useRouter();
  const { logout } = useCustomer();

  async function signOut() {
    await logout();
    router.replace("/");
    router.refresh();
  }

  return (
    <nav className="account-nav" aria-label="Hesabım menüsü">
      <ul>
        {ITEMS.map((item) => (
          <li key={item.href}>
            <Link href={item.href} aria-current={isActive(item.href, path) ? "page" : undefined}>
              <AccountIcon name={item.icon} />
              {item.label}
            </Link>
          </li>
        ))}
        <li className="account-nav-out">
          <button type="button" onClick={() => void signOut()}>
            <AccountIcon name="logout" />
            Çıkış yap
          </button>
        </li>
      </ul>
    </nav>
  );
}
