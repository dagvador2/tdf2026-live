"use client";

import { useEffect, useState } from "react";
import { APP_CONFIG } from "@/lib/utils/constants";

function computeDaysUntil(target: Date): number {
  const now = new Date();
  const diff = target.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

export function CountdownBanner() {
  const [days, setDays] = useState(() => computeDaysUntil(APP_CONFIG.EVENT_DATE));

  useEffect(() => {
    const interval = setInterval(() => {
      setDays(computeDaysUntil(APP_CONFIG.EVENT_DATE));
    }, 60_000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex items-center justify-center gap-3 bg-secondary px-4 py-3 text-secondary-foreground">
      <span className="font-display text-3xl text-primary">{`J-${days}`}</span>
      <span className="text-sm">avant le départ — 20 juillet 2026, Alpes</span>
    </div>
  );
}
