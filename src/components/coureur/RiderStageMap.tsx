"use client";

import { useEffect, useState } from "react";
import { MapContainer } from "@/components/map/MapContainer";
import { parseGPX } from "@/lib/gpx/parser";

interface Checkpoint {
  lat: number;
  lng: number;
  name: string;
  type: string;
  kmFromStart: number;
}

interface RiderStageMapProps {
  gpxUrl: string;
  checkpoints: Checkpoint[];
  stageName: string;
}

export function RiderStageMap({ gpxUrl, checkpoints, stageName }: RiderStageMapProps) {
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
      <div className="flex h-[300px] items-center justify-center rounded-lg border bg-muted">
        <p className="text-sm text-muted-foreground">Chargement de la carte...</p>
      </div>
    );
  }

  if (coordinates.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      <h2 className="font-display text-lg uppercase text-muted-foreground">
        {stageName}
      </h2>
      <MapContainer
        coordinates={coordinates}
        checkpoints={checkpoints}
        className="h-[300px] w-full rounded-lg"
      />
    </div>
  );
}
