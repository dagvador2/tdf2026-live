"use client";

import { cn } from "@/lib/utils";

export type ProgressSegment = {
  label: string;
  fill: number; // 0..1
  active: boolean;
};

/**
 * Progression segmentée : une barre par bloc (Portrait / Duels / Quiz /
 * Parrainage). Basée sur la position dans le parcours (et pas sur le nombre de
 * réponses), donc « Retour » fait reculer la barre.
 */
export function ProgressBar({ segments }: { segments: ProgressSegment[] }) {
  return (
    <div className="flex items-end gap-1.5">
      {segments.map((s) => (
        <div key={s.label} className="flex-1">
          <div
            className={cn(
              "mb-1 truncate text-center text-[9px] font-semibold uppercase tracking-wide sm:text-[10px]",
              s.active ? "text-secondary" : "text-muted-foreground",
            )}
          >
            {s.label}
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary/10">
            <div
              className="h-full rounded-full bg-primary transition-all duration-300 ease-out"
              style={{ width: `${Math.round(Math.min(1, Math.max(0, s.fill)) * 100)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
