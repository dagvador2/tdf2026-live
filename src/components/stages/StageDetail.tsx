"use client";

import { MapContainer } from "@/components/map/MapContainer";
import { ElevationProfile } from "@/components/elevation/ElevationProfile";
import type { GPXData } from "@/lib/gpx/parser";

interface StageDetailProps {
  gpxData: GPXData | null;
  checkpoints: {
    name: string;
    type: string;
    lat: number;
    lng: number;
    kmFromStart: number;
    elevation?: number | null;
  }[];
}

export function StageDetail({ gpxData, checkpoints }: StageDetailProps) {
  const cpMarks = checkpoints.map((cp) => ({
    ...cp,
    elevation: cp.elevation ?? undefined,
  }));

  if (!gpxData || gpxData.coordinates.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex h-[300px] items-center justify-center rounded-lg bg-muted">
          <p className="text-sm text-muted-foreground">
            Parcours GPX non encore disponible
          </p>
        </div>
        {checkpoints.length > 0 && (
          <CheckpointList checkpoints={cpMarks} />
        )}
      </div>
    );
  }

  const coordinates: [number, number][] = gpxData.coordinates.map((c) => [
    c.lng,
    c.lat,
  ]);

  return (
    <div className="space-y-4">
      <MapContainer
        coordinates={coordinates}
        checkpoints={cpMarks}
        className="h-[350px] w-full md:h-[450px]"
      />
      <ElevationProfile
        data={gpxData.elevationProfile}
        checkpoints={cpMarks}
        className="h-[180px] w-full md:h-[220px]"
      />
      {checkpoints.length > 0 && (
        <CheckpointList checkpoints={cpMarks} />
      )}
    </div>
  );
}

function CheckpointList({
  checkpoints,
}: {
  checkpoints: { name: string; type: string; kmFromStart: number; elevation?: number }[];
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <h3 className="mb-3 font-display text-lg uppercase text-secondary">
        Points de passage
      </h3>
      <div className="space-y-2">
        {checkpoints.map((cp, i) => (
          <div
            key={i}
            className="flex items-center justify-between rounded px-2 py-1.5 odd:bg-muted/50"
          >
            <div className="flex items-center gap-2">
              <div
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: getCheckpointColor(cp.type) }}
              />
              <span className="text-sm">{cp.name}</span>
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="font-mono">{cp.kmFromStart} km</span>
              {cp.elevation && (
                <span className="font-mono">{cp.elevation} m</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function getCheckpointColor(type: string): string {
  switch (type) {
    case "start": return "#8DB600";
    case "finish": return "#D32F2F";
    case "col": return "#E88B00";
    case "sprint": return "#0055A4";
    default: return "#666";
  }
}
