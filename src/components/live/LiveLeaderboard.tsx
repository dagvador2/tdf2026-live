"use client";

import { formatTime } from "@/lib/utils/formatters";
import type { RiderPosition } from "@/types";

interface LiveLeaderboardProps {
  // Triés du leader au dernier (distance décroissante) côté serveur.
  riders: RiderPosition[];
}

export function LiveLeaderboard({ riders }: LiveLeaderboardProps) {
  if (riders.length === 0) return null;

  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <div className="flex items-center justify-between border-b border-border bg-muted px-4 py-2">
        <h2 className="font-display text-sm uppercase tracking-wide text-secondary">
          Classement live
        </h2>
        <span className="text-xs text-muted-foreground">
          {riders.length} coureurs
        </span>
      </div>
      <ol>
        {riders.map((rider, index) => {
          const isLeader = index === 0;
          const gapLabel = isLeader
            ? "LEADER"
            : rider.timeGapToLeader !== null
              ? formatTime(rider.timeGapToLeader)
              : "—";

          return (
            <li
              key={rider.riderId}
              className="flex items-center gap-3 border-b border-border px-4 py-2.5 last:border-b-0"
            >
              <span className="w-5 text-center font-mono text-sm font-bold text-muted-foreground">
                {index + 1}
              </span>
              <span
                className="h-3 w-3 shrink-0 rounded-full"
                style={{ backgroundColor: rider.teamColor }}
                aria-hidden
              />
              <span className="flex-1 truncate font-display uppercase text-secondary">
                {rider.firstName}
              </span>
              <span className="hidden font-mono text-xs text-muted-foreground sm:inline">
                {(rider.distanceFromStart / 1000).toFixed(1)} km
              </span>
              <span
                className={`w-20 text-right font-mono text-sm font-bold ${
                  isLeader ? "text-primary" : "text-foreground"
                }`}
              >
                {gapLabel}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
