"use client";

import { formatTime } from "@/lib/utils/formatters";
import type { RiderPosition } from "@/types";

interface RiderStandingsProps {
  // Triés du leader au dernier (distance décroissante) côté serveur.
  riders: RiderPosition[];
  // Coureur courant à mettre en évidence.
  currentRiderId: string;
}

/**
 * Classement live complet pour l'écran course du coureur (thème sombre).
 * Met en évidence la ligne du coureur courant. Réutilise les positions SSE.
 */
export function RiderStandings({ riders, currentRiderId }: RiderStandingsProps) {
  if (riders.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center px-4">
        <p className="text-sm text-gray-400">En attente des positions…</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-3 py-1">
      <ol className="space-y-1">
        {riders.map((rider, index) => {
          const isLeader = index === 0;
          const isMe = rider.riderId === currentRiderId;
          const gapLabel = isLeader
            ? "LEADER"
            : rider.timeGapToLeader !== null
              ? `+${formatTime(rider.timeGapToLeader)}`
              : "—";

          return (
            <li
              key={rider.riderId}
              className={`flex items-center gap-2 rounded-lg px-3 py-2 ${
                isMe ? "bg-[#F2C200] text-[#0D0D0D]" : "bg-gray-900 text-white"
              }`}
            >
              <span
                className={`w-5 text-center font-mono text-sm font-bold ${
                  isMe ? "text-[#0D0D0D]" : "text-gray-400"
                }`}
              >
                {index + 1}
              </span>
              <span
                className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full font-display text-xs text-white"
                style={{ backgroundColor: rider.teamColor, border: `2px solid ${rider.teamColor}` }}
              >
                {rider.photoZoomUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={rider.photoZoomUrl}
                    alt={rider.firstName}
                    className="h-full w-full bg-white object-cover object-top"
                  />
                ) : (
                  rider.firstName.charAt(0)
                )}
              </span>
              <span className="flex-1 truncate font-bold uppercase">
                {rider.firstName}
              </span>
              <span
                className={`w-20 text-right font-mono text-sm font-bold ${
                  isMe ? "text-[#0D0D0D]" : isLeader ? "text-[#F2C200]" : "text-white"
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
