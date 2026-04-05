"use client";

import { useEffect, useState } from "react";
import { LiveMap } from "./LiveMap";
import { parseGPX } from "@/lib/gpx/parser";
import type { LiveSnapshot } from "@/lib/time-gap/types";
import type { RiderPosition } from "@/types";

interface RiderMapViewProps {
  gpxUrl: string;
  checkpoints: {
    lat: number;
    lng: number;
    name: string;
    type: string;
    kmFromStart: number;
  }[];
  snapshot: LiveSnapshot | null;
  riderId?: string;
  sseConnected: boolean;
}

export function RiderMapView({
  gpxUrl,
  checkpoints,
  snapshot,
  sseConnected,
}: RiderMapViewProps) {
  const [coordinates, setCoordinates] = useState<[number, number][]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(gpxUrl)
      .then((res) => res.text())
      .then((gpxString) => {
        const data = parseGPX(gpxString);
        setCoordinates(data.coordinates.map((c) => [c.lng, c.lat]));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [gpxUrl]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-gray-400">Chargement de la carte...</p>
      </div>
    );
  }

  const riders: RiderPosition[] = snapshot?.riders ?? [];

  return (
    <div className="h-full overflow-hidden rounded-lg">
      <LiveMap
        coordinates={coordinates}
        checkpoints={checkpoints}
        riders={riders}
        connected={sseConnected}
      />
    </div>
  );
}
