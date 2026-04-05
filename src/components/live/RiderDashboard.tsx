"use client";

import { useCallback, useMemo, useState, useEffect, useRef } from "react";
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
import { Map, Gauge, Timer } from "lucide-react";

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

function useElapsedTime(tracking: boolean) {
  const [elapsed, setElapsed] = useState(0);
  const startRef = useRef<number | null>(null);

  useEffect(() => {
    if (tracking && !startRef.current) {
      startRef.current = Date.now() - elapsed * 1000;
    }
    if (!tracking) {
      startRef.current = null;
      return;
    }

    const interval = setInterval(() => {
      if (startRef.current) {
        setElapsed(Math.floor((Date.now() - startRef.current) / 1000));
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [tracking, elapsed]);

  const h = Math.floor(elapsed / 3600);
  const m = Math.floor((elapsed % 3600) / 60);
  const s = elapsed % 60;

  return `${h > 0 ? `${h}:` : ""}${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
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
  const { status: syncStatus, bufferedCount, lastError: syncError, handleNewPoint } = useGPSSync(token, stageId);
  const { state, error, start, pause, resume, stop } = useGPSTracker(
    useCallback(
      (point) => {
        handleNewPoint(point);
      },
      [handleNewPoint]
    )
  );

  const isTracking = state === "tracking";
  const elapsedStr = useElapsedTime(isTracking);

  const { data: snapshot, connected: sseConnected } = useSSE<LiveSnapshot>(
    `/api/live/stream?stageId=${stageId}`
  );

  const myData = useMemo(() => {
    if (!snapshot?.riders) return null;
    return snapshot.riders.find((r) => r.riderId === riderId) ?? null;
  }, [snapshot, riderId]);

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
            {/* Chrono */}
            <div className="flex items-center justify-center gap-2 rounded-lg bg-gray-900 px-4 py-2">
              <Timer className="h-4 w-4 text-[#F2C200]" />
              <span className="font-mono text-2xl font-bold text-[#F2C200]">
                {elapsedStr}
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
              sseConnected={sseConnected}
            />
          </div>
        )}
      </div>

      {/* Controls — always at bottom, fixed */}
      <div className="shrink-0 space-y-2 px-4 pb-4 pt-2">
        {error && (
          <p className="text-center text-xs text-red-400">{error}</p>
        )}
        {syncError && (
          <p className="text-center text-xs text-orange-400">Sync: {syncError}</p>
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
