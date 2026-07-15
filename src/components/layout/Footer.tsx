"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const FOOTER_LINKS = [
  { href: "/etapes", label: "Étapes" },
  { href: "/equipes", label: "Équipes" },
  { href: "/classements", label: "Classements" },
  { href: "/histoires", label: "Histoires" },
  { href: "/mon-espace", label: "Mon espace" },
];

export function Footer() {
  const pathname = usePathname();

  // Hide on admin, mode course and OBS overlay pages
  if (
    pathname.startsWith("/admin") ||
    pathname.startsWith("/overlay") ||
    pathname === "/mon-espace/course"
  ) {
    return null;
  }

  return (
    <footer className="hidden border-t-4 border-primary bg-secondary text-secondary-foreground md:block">
      <div className="mx-auto max-w-7xl px-4 py-10">
        <div className="grid gap-8 md:grid-cols-3">
          <div>
            <p className="font-display text-2xl uppercase text-primary">
              TDF 2026 Live Tracker
            </p>
            <p className="mt-2 max-w-xs text-sm text-secondary-foreground/70">
              Tour de France amateur entre amis — Alpes, 20-25 juillet 2026.
              Suivi GPS en direct, écarts en temps réel, classements live.
            </p>
          </div>

          <nav className="flex flex-col gap-2 md:items-center">
            {FOOTER_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm text-secondary-foreground/70 transition-colors hover:text-primary"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="flex flex-col gap-1 text-sm text-secondary-foreground/50 md:items-end">
            <p className="font-mono">29 coureurs · 4 équipes · 6 étapes</p>
            <p className="font-mono">376 km · 8 031 m D+</p>
            <p className="mt-4 text-xs">
              Fait maison, avec plus d&apos;amour que de watts.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
