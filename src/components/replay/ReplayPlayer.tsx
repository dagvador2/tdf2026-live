"use client";

import { useEffect, useState } from "react";
import { MapContainer } from "@/components/map/MapContainer";
import { useRiderMarker } from "@/components/live/RiderMarker";
import { ReplayControls } from "./ReplayControls";
import { ReplayFeed } from "./ReplayFeed";
import { useReplayEngine } from "@/hooks/useReplayEngine";
import { loadReplayData } from "@/lib/replay/loader";
import type { ReplayData } from "@/lib/replay/types";
import type { RiderPosition } from "@/types";
import maplibregl from "maplibre-gl";

interface ReplayPlayerProps {
  stageId: string;
  stageNumber: number;
  stageName: string;
  coordinates: [number, number][];
  checkpoints: {
    lat: number;
    lng: number;
    name: string;
    type: string;
    kmFromStart: number;
  }[];
  riderMap: Record<string, { firstName: string; teamColor: string }>;
}

export function ReplayPlayer({
  stageId,
  stageNumber,
  stageName,
  coordinates,
  checkpoints,
  riderMap,
}: ReplayPlayerProps) {
  const [data, setData] = useState<ReplayData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [map, setMap] = useState<maplibregl.Map | null>(null);

  const engine = useReplayEngine(data);

  useEffect(() => {
    setLoading(true);
    loadReplayData(stageId)
      .then(setData)
      .catch(() => setError("Impossible de charger les données de replay"))
      .finally(() => setLoading(false));
  }, [stageId]);

  // Convert current frame positions to RiderPosition for markers
  const riders: RiderPosition[] = (engine.currentFrame?.positions ?? []).map((p) => {
    const info = riderMap[p.riderId] ?? { firstName: "?", teamColor: "#999" };
    return {
      riderId: p.riderId,
      firstName: info.firstName,
      teamColor: info.teamColor,
      latitude: p.latitude,
      longitude: p.longitude,
      speed: p.speed,
      distanceFromStart: 0,
      timeGapToLeader: null,
      riderAhead: null,
      riderBehind: null,
    };
  });

  if (loading) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Chargement du replay…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <p className="text-sm text-muted-foreground">{error}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-4">
      <div className="mb-4 flex items-center gap-3">
        <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium uppercase text-muted-foreground">
          Replay
        </span>
        <h1 className="font-display text-2xl uppercase text-secondary">
          Étape {stageNumber} — {stageName}
        </h1>
      </div>

      {/* Map */}
      <div className="relative">
        <MapContainer
          coordinates={coordinates}
          checkpoints={checkpoints}
          className="h-[400px] w-full md:h-[500px]"
          onMapReady={setMap}
        />
        {map && riders.map((rider) => (
          <ReplayMarkerWrapper key={rider.riderId} rider={rider} map={map} />
        ))}
      </div>

      {/* Controls */}
      <div className="mt-4">
        <ReplayControls
          playing={engine.playing}
          speed={engine.speed}
          progress={engine.progress}
          currentTime={engine.currentTime}
          startTime={data?.startTime ?? 0}
          endTime={data?.endTime ?? 0}
          onPlay={engine.play}
          onPause={engine.pause}
          onSetSpeed={engine.setSpeed}
          onScrub={engine.scrubTo}
        />
      </div>

      {/* Feed */}
      <div className="mt-4">
        <ReplayFeed
          posts={engine.visiblePosts}
          recentCheckpoints={engine.recentCheckpoints}
        />
      </div>
    </div>
  );
}

function ReplayMarkerWrapper({
  rider,
  map,
}: {
  rider: RiderPosition;
  map: maplibregl.Map;
}) {
  useRiderMarker({ rider, map });
  return null;
}
