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
  BookOpen,
  User,
  Radio,
} from "lucide-react";
import { useTwitchLive } from "@/hooks/useTwitchLive";

const NAV_ITEMS = [
  { href: "/", label: "Accueil", icon: Home },
  { href: "/equipes", label: "Équipes", icon: Users },
  { href: "/etapes", label: "Étapes", icon: Map },
  { href: "/classements", label: "Classement", icon: Trophy },
  { href: "/histoires", label: "Histoires", icon: BookOpen },
];

export function MobileNav() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const isLoggedIn = !!session?.user;
  const twitch = useTwitchLive();

  if (
    pathname.startsWith("/admin") ||
    pathname.startsWith("/overlay") ||
    pathname === "/mon-espace/course"
  ) {
    return null;
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 md:hidden">
      <div className="flex h-16 items-center px-1">
        {twitch.live && (
          <Link
            href="/live"
            className={cn(
              "relative flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-md px-1 py-1.5 transition-colors",
              pathname.startsWith("/live")
                ? "text-red-600"
                : "text-red-600/80 hover:text-red-600"
            )}
          >
            <span className="relative">
              <Radio className="h-5 w-5 shrink-0" />
              <span className="absolute -right-1 -top-1 h-2 w-2 animate-pulse rounded-full bg-red-600" />
            </span>
            <span className="w-full truncate text-center text-[10px] font-medium">
              Direct
            </span>
          </Link>
        )}
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
                "flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-md px-0.5 py-1.5 transition-colors",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="h-5 w-5 shrink-0" />
              <span className="w-full truncate text-center text-[10px] font-medium">
                {item.label}
              </span>
            </Link>
          );
        })}
        <Link
          href={isLoggedIn ? "/mon-espace" : "/connexion"}
          className={cn(
            "flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-md px-1 py-1.5 transition-colors",
            pathname.startsWith("/mon-espace") || pathname === "/connexion"
              ? "text-primary"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <User className="h-5 w-5 shrink-0" />
          <span className="w-full truncate text-center text-[10px] font-medium">
            Moi
          </span>
        </Link>
      </div>
    </nav>
  );
}
