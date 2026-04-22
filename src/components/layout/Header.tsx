"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { cn } from "@/lib/utils";
import { Logo } from "./Logo";
import { User } from "lucide-react";

const NAV_ITEMS = [
  { href: "/", label: "Accueil" },
  { href: "/equipes", label: "Équipes" },
  { href: "/etapes", label: "Étapes" },
  { href: "/classements", label: "Classements" },
  { href: "/actu", label: "Actu" },
];

export function Header() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const isLoggedIn = !!session?.user;

  // Hide on admin and mode course pages
  if (
    pathname.startsWith("/admin") ||
    pathname === "/mon-espace/course"
  ) {
    return null;
  }

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
        <Logo />

        {/* Desktop nav */}
        <nav className="hidden items-center gap-1 md:flex">
          {NAV_ITEMS.map((item) => {
            const isActive =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "rounded-md px-3 py-2 font-display text-sm uppercase tracking-wide transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-foreground/70 hover:bg-muted hover:text-foreground"
                )}
              >
                {item.label}
              </Link>
            );
          })}
          <Link
            href={isLoggedIn ? "/mon-espace" : "/connexion"}
            className={cn(
              "ml-2 flex items-center gap-1 rounded-md px-3 py-2 font-display text-sm uppercase tracking-wide transition-colors",
              pathname.startsWith("/mon-espace") || pathname === "/connexion"
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
            )}
          >
            <User className="h-3.5 w-3.5" />
            Mon espace
          </Link>
        </nav>
      </div>
    </header>
  );
}
