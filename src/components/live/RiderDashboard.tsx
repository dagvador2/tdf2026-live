"use client";

import { useMemo, useState } from "react";
import { useLivePositions } from "@/hooks/useLivePositions";
import { GapDisplay } from "./GapDisplay";
import { NextCheckpoint } from "./NextCheckpoint";
import { RiderMapView } from "./RiderMapView";
import { formatSpeed } from "@/lib/utils/formatters";
import type { LiveSnapshot } from "@/lib/time-gap/types";
import { Map, Gauge, Radio } from "lucide-react";

interface RiderDashboardProps {
  riderId: string;
  riderName: string;
  teamColor: string;
  stageId: string;
  stageName: string;
  totalDistanceKm: number;
  gpxUrl?: string | null;
  checkpoints: Array<{
    name: string;
    type: string;
    kmFromStart: number;
  }>;
  checkpointsWithCoords?: Array<{
    lat: number;
    lng: number;
    name: string;
    type: string;
    kmFromStart: number;
  }>;
}

export function RiderDashboard({
  riderId,
  riderName,
  teamColor,
  stageId,
  stageName,
  totalDistanceKm,
  gpxUrl,
  checkpoints,
  checkpointsWithCoords,
}: RiderDashboardProps) {
  const [viewMode, setViewMode] = useState<"race" | "map">("race");

  // Le suivi GPS vient de l'app Traccar (source unique). Cet écran ne fait
  // qu'afficher les données live du coureur — il ne capte plus le GPS.
  const { riders, connected } = useLivePositions(stageId);

  const myData = useMemo(
    () => riders.find((r) => r.riderId === riderId) ?? null,
    [riders, riderId]
  );

  const snapshot: LiveSnapshot = useMemo(
    () => ({ stageId, timestamp: Date.now(), riders }),
    [stageId, riders]
  );

  const distanceKm = myData ? myData.distanceFromStart / 1000 : 0;
  const speedKmh = myData?.speed ? myData.speed * 3.6 : 0;

  const nextCheckpoint = useMemo(() => {
    if (!checkpoints.length) return null;
    return checkpoints.find((cp) => cp.kmFromStart > distanceKm) ?? null;
  }, [checkpoints, distanceKm]);

  const isLeader = myData?.timeGapToLeader === null && myData !== null;

  return (
    <div className="fixed inset-0 flex flex-col bg-[#0D0D0D] text-white">
      {/* Header */}
      <header className="flex shrink-0 items-center justify-between px-4 py-2">
        <div className="min-w-0">
          <h1 className="truncate font-mono text-xs font-bold uppercase text-gray-400">
            {stageName}
          </h1>
          <p className="text-base font-bold" style={{ color: teamColor }}>
            {riderName}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {gpxUrl && (
            <button
              onClick={() => setViewMode(viewMode === "race" ? "map" : "race")}
              className="flex items-center gap-1 rounded-full bg-gray-800 px-2.5 py-1 text-[10px] font-bold uppercase text-gray-300"
            >
              {viewMode === "race" ? (
                <><Map className="h-3 w-3" /> Carte</>
              ) : (
                <><Gauge className="h-3 w-3" /> Course</>
              )}
            </button>
          )}
          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase text-[#F2C200]">
            <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-red-500" />
            LIVE
          </span>
        </div>
      </header>

      {/* Main content — fills remaining space, no scroll */}
      <div className="flex min-h-0 flex-1 flex-col">
        {viewMode === "race" ? (
          <div className="flex flex-1 flex-col justify-between px-4 py-1">
            {/* Statut suivi Traccar */}
            <div className="flex items-center justify-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-center">
              <Radio
                className={`h-4 w-4 ${connected ? "text-[#F2C200]" : "text-gray-500"}`}
              />
              <span className="text-xs text-gray-300">
                {myData
                  ? "Suivi en direct via Traccar"
                  : "En attente de ta position Traccar…"}
              </span>
            </div>

            {/* Leader gap */}
            <div className="rounded-xl bg-gray-900 px-4 py-4 text-center">
              <span className="text-[10px] font-medium uppercase tracking-wider text-gray-400">
                Écart au leader
              </span>
              <p
                className={`font-mono text-5xl font-black leading-none ${
                  isLeader ? "text-[#F2C200]" : "text-white"
                }`}
              >
                {isLeader
                  ? "LEADER"
                  : myData?.timeGapToLeader !== undefined && myData?.timeGapToLeader !== null
                    ? `+${Math.floor(myData.timeGapToLeader / 60)}:${String(
                        Math.round(myData.timeGapToLeader % 60)
                      ).padStart(2, "0")}`
                    : "—"}
              </p>
            </div>

            {/* Adjacent riders */}
            <div className="grid grid-cols-2 gap-2">
              <GapDisplay
                label="Devant"
                gap={myData?.riderAhead?.gap ?? null}
              />
              <GapDisplay
                label="Derrière"
                gap={myData?.riderBehind?.gap ?? null}
              />
            </div>

            {/* Distance + Speed */}
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-lg bg-gray-900 px-3 py-2 text-center">
                <span className="text-[10px] font-medium uppercase tracking-wider text-gray-400">
                  Distance
                </span>
                <p className="font-mono text-2xl font-bold text-white">
                  {distanceKm.toFixed(1)}
                  <span className="text-sm text-gray-400">
                    /{totalDistanceKm.toFixed(0)}
                  </span>
                </p>
              </div>
              <div className="rounded-lg bg-gray-900 px-3 py-2 text-center">
                <span className="text-[10px] font-medium uppercase tracking-wider text-gray-400">
                  Vitesse
                </span>
                <p className="font-mono text-2xl font-bold text-white">
                  {speedKmh > 0 ? formatSpeed(speedKmh) : "—"}
                </p>
              </div>
            </div>

            {/* Next checkpoint */}
            <NextCheckpoint
              name={nextCheckpoint?.name ?? null}
              distanceKm={
                nextCheckpoint ? nextCheckpoint.kmFromStart - distanceKm : null
              }
              type={nextCheckpoint?.type ?? null}
            />
          </div>
        ) : (
          <div className="flex-1">
            <RiderMapView
              gpxUrl={gpxUrl!}
              checkpoints={checkpointsWithCoords ?? []}
              snapshot={snapshot}
              riderId={riderId}
              sseConnected={connected}
            />
          </div>
        )}
      </div>

      {/* Footer info */}
      <div className="shrink-0 px-4 pb-4 pt-2 text-center">
        <p className="text-[10px] text-gray-500">
          Rien à lancer : l&apos;app Traccar envoie ta position automatiquement,
          écran éteint.
        </p>
      </div>
    </div>
  );
}
