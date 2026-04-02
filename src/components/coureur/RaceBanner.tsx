"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { Radio } from "lucide-react";

/**
 * Sticky banner that appears on non-race pages when the rider
 * has an active token + a stage is live. Allows quick return to race mode.
 */
export function RaceBanner() {
  const pathname = usePathname();
  const [riderToken, setRiderToken] = useState<string | null>(null);
  const [stageLive, setStageLive] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("riderToken");
    setRiderToken(token);
    if (!token) return;

    // Check if any stage is live
    fetch("/api/riders/stage-status")
      .then((res) => res.json())
      .then((data) => setStageLive(data.live))
      .catch(() => {});
  }, [pathname]);

  // Don't show on race mode pages, admin, or connexion
  if (
    !riderToken ||
    !stageLive ||
    pathname.match(/^\/coureur\/.+\/live/) ||
    pathname.startsWith("/admin") ||
    pathname === "/connexion"
  ) {
    return null;
  }

  return (
    <div className="fixed bottom-16 left-0 right-0 z-40 md:bottom-0">
      <Link
        href={`/coureur/${riderToken}/live`}
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
