"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { cn } from "@/lib/utils";
import { Logo } from "./Logo";
import { HelpCircle, User } from "lucide-react";
import { useTwitchLive } from "@/hooks/useTwitchLive";
import { openWelcomeTour } from "@/components/onboarding/WelcomeTour";

const NAV_ITEMS = [
  { href: "/", label: "Accueil" },
  { href: "/equipes", label: "Équipes" },
  { href: "/etapes", label: "Étapes" },
  { href: "/classements", label: "Classements" },
  { href: "/histoires", label: "Histoires" },
];

export function Header() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const isLoggedIn = !!session?.user;
  const twitch = useTwitchLive();

  // On the home page the header floats transparent over the video hero,
  // then gains its solid background once the user scrolls.
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Hide on admin, mode course and OBS overlay pages
  if (
    pathname.startsWith("/admin") ||
    pathname.startsWith("/overlay") ||
    pathname === "/mon-espace/course"
  ) {
    return null;
  }

  const overlay = pathname === "/" && !scrolled;

  return (
    <header
      className={cn(
        "sticky top-0 z-50 transition-colors duration-300",
        overlay
          ? "border-b border-transparent bg-transparent"
          : "border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80",
      )}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
        <Logo variant={overlay ? "inverted" : "default"} />

        <div className="flex items-center gap-1">
          {/* Desktop nav */}
          <nav className="hidden items-center gap-1 md:flex">
            {twitch.live && (
              <Link
                href="/live"
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-3 py-2 font-display text-sm uppercase tracking-wide transition-colors",
                  pathname.startsWith("/live")
                    ? "bg-red-600 text-white"
                    : overlay
                      ? "text-red-400 hover:bg-white/10"
                      : "text-red-600 hover:bg-red-600/10",
                )}
              >
                <span
                  className={cn(
                    "h-2 w-2 animate-pulse rounded-full",
                    pathname.startsWith("/live")
                      ? "bg-white"
                      : overlay
                        ? "bg-red-400"
                        : "bg-red-600",
                  )}
                />
                En direct
              </Link>
            )}
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
                    isActive && !overlay
                      ? "bg-primary text-primary-foreground"
                      : overlay
                        ? "text-white/80 hover:bg-white/10 hover:text-white"
                        : "text-foreground/70 hover:bg-muted hover:text-foreground",
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
                  : overlay
                    ? "bg-white/10 text-white hover:bg-white/20"
                    : "bg-secondary text-secondary-foreground hover:bg-secondary/80",
              )}
            >
              <User className="h-3.5 w-3.5" />
              Mon espace
            </Link>
          </nav>

          {/* Help — reopens the welcome tour */}
          <button
            type="button"
            onClick={openWelcomeTour}
            aria-label="Comment ça marche ?"
            title="Comment ça marche ?"
            className={cn(
              "rounded-md p-2 transition-colors",
              overlay
                ? "text-white/60 hover:bg-white/10 hover:text-white"
                : "text-foreground/60 hover:bg-muted hover:text-foreground",
            )}
          >
            <HelpCircle className="h-5 w-5" />
          </button>
        </div>
      </div>
    </header>
  );
}
