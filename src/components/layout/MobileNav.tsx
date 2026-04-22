"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { cn } from "@/lib/utils";
import {
  Home,
  Users,
  Map,
  Trophy,
  Newspaper,
  User,
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/", label: "Accueil", icon: Home },
  { href: "/equipes", label: "Équipes", icon: Users },
  { href: "/etapes", label: "Étapes", icon: Map },
  { href: "/classements", label: "Classements", icon: Trophy },
  { href: "/actu", label: "Actu", icon: Newspaper },
];

export function MobileNav() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const isLoggedIn = !!session?.user;

  if (pathname.startsWith("/admin") || pathname === "/mon-espace/course") {
    return null;
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 md:hidden">
      <div className="flex h-16 items-center justify-around px-2">
        {NAV_ITEMS.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-0.5 rounded-md px-3 py-1.5 transition-colors",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="h-5 w-5" />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}
        <Link
          href={isLoggedIn ? "/mon-espace" : "/connexion"}
          className={cn(
            "flex flex-col items-center gap-0.5 rounded-md px-3 py-1.5 transition-colors",
            pathname.startsWith("/mon-espace") || pathname === "/connexion"
              ? "text-primary"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <User className="h-5 w-5" />
          <span className="text-[10px] font-medium">Moi</span>
        </Link>
      </div>
    </nav>
  );
}
