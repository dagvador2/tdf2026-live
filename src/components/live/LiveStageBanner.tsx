"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { Radio } from "lucide-react";

interface LiveStage {
  id: string;
  number: number;
  name: string;
}

/**
 * Banner collant (sous le header) qui s'affiche pour TOUS les spectateurs dès
 * qu'une étape est en direct. Renvoie vers le suivi live + classement de
 * l'étape. Se masque sur les pages admin / overlay / mode course, et sur la
 * page live de l'étape elle-même.
 */
export function LiveStageBanner() {
  const pathname = usePathname();
  const [stage, setStage] = useState<LiveStage | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = () => {
      fetch("/api/live/current-stage", { cache: "no-store" })
        .then((res) => res.json())
        .then((data) => {
          if (!cancelled) setStage(data.stage ?? null);
        })
        .catch(() => {});
    };

    load();
    const interval = setInterval(load, 30_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [pathname]);

  const hidden =
    !stage ||
    pathname === "/mon-espace/course" ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/overlay") ||
    // Déjà sur le suivi live de l'étape → pas besoin du banner
    pathname === `/etapes/${stage.id}/live`;

  if (hidden) return null;

  return (
    <div className="sticky top-16 z-40">
      <Link
        href={`/etapes/${stage.id}/live`}
        className="flex items-center justify-center gap-2 bg-red-600 px-4 py-2.5 text-white shadow-md transition-colors hover:bg-red-700"
      >
        <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-white" />
        <Radio className="h-4 w-4" />
        <span className="text-sm font-bold uppercase tracking-wide">
          Étape {stage.number} en direct — Voir le classement live
        </span>
      </Link>
    </div>
  );
}
