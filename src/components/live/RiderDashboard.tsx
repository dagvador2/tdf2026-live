"use client";

import { useCallback, useMemo, useState } from "react";
import { useGPSTracker } from "@/hooks/useGPSTracker";
import { useGPSSync } from "@/hooks/useGPSSync";
import { useSSE } from "@/hooks/useSSE";
import { GapDisplay } from "./GapDisplay";
import { NextCheckpoint } from "./NextCheckpoint";
import { TrackingControls } from "./TrackingControls";
import { ConnectionStatus } from "./ConnectionStatus";
import { RiderMapView } from "./RiderMapView";
import { formatSpeed } from "@/lib/utils/formatters";
import type { LiveSnapshot } from "@/lib/time-gap/types";
import { Map, Gauge } from "lucide-react";

interface RiderDashboardProps {
  riderId: string;
  riderName: string;
  teamColor: string;
  token: string;
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
  token,
  stageId,
  stageName,
  totalDistanceKm,
  gpxUrl,
  checkpoints,
  checkpointsWithCoords,
}: RiderDashboardProps) {
  const [viewMode, setViewMode] = useState<"race" | "map">("race");
  const { status: syncStatus, bufferedCount, handleNewPoint } = useGPSSync(token, stageId);
  const { state, error, start, pause, resume, stop } = useGPSTracker(
    useCallback(
      (point) => {
        handleNewPoint(point);
      },
      [handleNewPoint]
    )
  );

  const { data: snapshot, connected: sseConnected } = useSSE<LiveSnapshot>(
    `/api/live/stream?stageId=${stageId}`
  );

  // Find this rider's data in the SSE snapshot
  const myData = useMemo(() => {
    if (!snapshot?.riders) return null;
    return snapshot.riders.find((r) => r.riderId === riderId) ?? null;
  }, [snapshot, riderId]);

  const distanceKm = myData ? myData.distanceFromStart / 1000 : 0;
  const speedKmh = myData?.speed ? myData.speed * 3.6 : 0;

  // Next checkpoint
  const nextCheckpoint = useMemo(() => {
    if (!checkpoints.length) return null;
    const currentKm = distanceKm;
    return (
      checkpoints.find((cp) => cp.kmFromStart > currentKm) ?? null
    );
  }, [checkpoints, distanceKm]);

  const isLeader = myData?.timeGapToLeader === null && myData !== null;

  return (
    <div className="flex min-h-screen flex-col bg-[#0D0D0D] text-white">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3">
        <div>
          <h1 className="font-mono text-sm font-bold uppercase text-gray-400">
            {stageName}
          </h1>
          <p className="text-lg font-bold" style={{ color: teamColor }}>
            {riderName}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {gpxUrl && (
            <button
              onClick={() => setViewMode(viewMode === "race" ? "map" : "race")}
              className="flex items-center gap-1 rounded-full bg-gray-800 px-3 py-1.5 text-xs font-bold uppercase text-gray-300 transition-colors hover:bg-gray-700"
            >
              {viewMode === "race" ? (
                <><Map className="h-3.5 w-3.5" /> Carte</>
              ) : (
                <><Gauge className="h-3.5 w-3.5" /> Course</>
              )}
            </button>
          )}
          <span className="inline-flex items-center gap-1 text-xs font-bold uppercase text-[#F2C200]">
            <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-red-500" />
            LIVE
          </span>
        </div>
      </header>

      {/* Main content — toggle between race mode and map mode */}
      {viewMode === "race" ? (
        <div className="flex-1 space-y-3 px-4 py-2">
          {/* Leader gap — BIGGEST */}
          <div className="rounded-xl bg-gray-900 px-6 py-6 text-center">
            <span className="text-xs font-medium uppercase tracking-wider text-gray-400">
              Écart au leader
            </span>
            <p
              className={`font-mono text-6xl font-black leading-none ${
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
          <div className="grid grid-cols-2 gap-3">
            <GapDisplay
              label="Devant"
              gap={myData?.riderAhead?.gap ?? null}
              riderName={myData?.riderAhead ? undefined : undefined}
            />
            <GapDisplay
              label="Derrière"
              gap={myData?.riderBehind?.gap ?? null}
              riderName={myData?.riderBehind ? undefined : undefined}
            />
          </div>

          {/* Distance + Speed */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-gray-900 px-4 py-3 text-center">
              <span className="text-xs font-medium uppercase tracking-wider text-gray-400">
                Distance
              </span>
              <p className="font-mono text-3xl font-bold text-white">
                {distanceKm.toFixed(1)}
                <span className="text-lg text-gray-400">
                  /{totalDistanceKm.toFixed(0)} km
                </span>
              </p>
            </div>
            <div className="rounded-lg bg-gray-900 px-4 py-3 text-center">
              <span className="text-xs font-medium uppercase tracking-wider text-gray-400">
                Vitesse
              </span>
              <p className="font-mono text-3xl font-bold text-white">
                {speedKmh > 0 ? formatSpeed(speedKmh) : "—"}
              </p>
            </div>
          </div>

          {/* Next checkpoint */}
          <NextCheckpoint
            name={nextCheckpoint?.name ?? null}
            distanceKm={
              nextCheckpoint
                ? nextCheckpoint.kmFromStart - distanceKm
                : null
            }
            type={nextCheckpoint?.type ?? null}
          />
        </div>
      ) : (
        <div className="flex-1 px-2 py-2">
          <RiderMapView
            gpxUrl={gpxUrl!}
            checkpoints={checkpointsWithCoords ?? []}
            snapshot={snapshot}
            riderId={riderId}
            sseConnected={sseConnected}
          />
        </div>
      )}

      {/* Controls + status */}
      <div className="space-y-3 px-4 pb-6">
        {error && (
          <p className="text-center text-sm text-red-400">{error}</p>
        )}
        <TrackingControls
          state={state}
          onStart={start}
          onPause={pause}
          onResume={resume}
          onStop={stop}
        />
        <ConnectionStatus
          syncStatus={syncStatus}
          sseConnected={sseConnected}
          bufferedCount={bufferedCount}
        />
      </div>
    </div>
  );
}
