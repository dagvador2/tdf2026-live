"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { Radio } from "lucide-react";

/**
 * Banner collant qui s'affiche hors mode course quand le coureur est connecté
 * ET qu'une étape est live. Permet de revenir rapidement en mode course.
 */
export function RaceBanner() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [stageLive, setStageLive] = useState(false);

  const isRider = session?.user?.role === "rider";

  useEffect(() => {
    if (!isRider) {
      setStageLive(false);
      return;
    }
    fetch("/api/riders/stage-status")
      .then((res) => res.json())
      .then((data) => setStageLive(!!data.live))
      .catch(() => {});
  }, [isRider, pathname]);

  if (
    !isRider ||
    !stageLive ||
    pathname === "/mon-espace/course" ||
    pathname.startsWith("/admin") ||
    pathname === "/connexion"
  ) {
    return null;
  }

  return (
    <div className="fixed bottom-16 left-0 right-0 z-40 md:bottom-0">
      <Link
        href="/mon-espace/course"
        className="flex items-center justify-center gap-2 bg-[#0D0D0D] px-4 py-3 text-white shadow-lg transition-colors hover:bg-[#1a1a1a]"
      >
        <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-red-500" />
        <Radio className="h-4 w-4 text-[#F2C200]" />
        <span className="text-sm font-bold uppercase">
          Tu es en course — Retour mode course
        </span>
      </Link>
    </div>
  );
}
