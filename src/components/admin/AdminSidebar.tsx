"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  Flag,
  MapPin,
  ClipboardList,
  Trophy,
  Newspaper,
  LogOut,
  ShieldCheck,
} from "lucide-react";
import { signOut } from "next-auth/react";

const ADMIN_NAV = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/equipes", label: "Équipes", icon: ShieldCheck },
  { href: "/admin/coureurs", label: "Coureurs", icon: Users },
  { href: "/admin/etapes", label: "Étapes", icon: Flag },
  { href: "/admin/inscriptions", label: "Inscriptions", icon: ClipboardList },
  { href: "/admin/resultats", label: "Résultats", icon: Trophy },
  { href: "/admin/actu", label: "Fil d'actu", icon: Newspaper },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-screen w-56 flex-col border-r border-border bg-card">
      {/* Header */}
      <div className="flex h-14 items-center border-b border-border px-4">
        <Link href="/admin" className="font-display text-xl uppercase text-primary">
          TDF Admin
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-1 p-3">
        {ADMIN_NAV.map((item) => {
          const isActive = item.exact
            ? pathname === item.href
            : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-border p-3">
        <Link
          href="/"
          className="mb-2 flex items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <MapPin className="h-4 w-4" />
          Voir le site
        </Link>
        <button
          onClick={() => signOut({ callbackUrl: "/admin/login" })}
          className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
        >
          <LogOut className="h-4 w-4" />
          Déconnexion
        </button>
      </div>
    </aside>
  );
}
