"use client";

import { useState, useCallback } from "react";
import maplibregl from "maplibre-gl";
import { MapContainer } from "@/components/map/MapContainer";
import { useRiderMarker } from "./RiderMarker";
import { RiderPopup } from "./RiderPopup";
import type { RiderPosition } from "@/types";

interface LiveMapProps {
  coordinates: [number, number][];
  checkpoints: {
    lat: number;
    lng: number;
    name: string;
    type: string;
    kmFromStart: number;
  }[];
  riders: RiderPosition[];
  connected: boolean;
}

export function LiveMap({ coordinates, checkpoints, riders, connected }: LiveMapProps) {
  const [selectedRider, setSelectedRider] = useState<RiderPosition | null>(null);
  const [map, setMap] = useState<maplibregl.Map | null>(null);

  const handleMapReady = useCallback((m: maplibregl.Map) => {
    setMap(m);
  }, []);

  return (
    <div className="relative">
      {/* Live indicator */}
      <div className="absolute left-3 top-3 z-10 flex items-center gap-2 rounded-full bg-black/70 px-3 py-1.5 backdrop-blur">
        <span
          className={`h-2.5 w-2.5 rounded-full ${
            connected ? "animate-pulse bg-red-500" : "bg-gray-500"
          }`}
        />
        <span className="text-xs font-bold uppercase text-white">
          {connected ? "LIVE" : "Déconnecté"}
        </span>
      </div>

      <MapContainer
        coordinates={coordinates}
        checkpoints={checkpoints}
        className="h-[400px] w-full md:h-[500px]"
        onMapReady={handleMapReady}
      />

      {/* Rider markers */}
      {map && riders.map((rider) => (
        <RiderMarkerWrapper
          key={rider.id}
          rider={rider}
          map={map}
          onClick={setSelectedRider}
        />
      ))}

      {/* Selected rider popup */}
      {selectedRider && (
        <RiderPopup
          rider={selectedRider}
          onClose={() => setSelectedRider(null)}
        />
      )}
    </div>
  );
}

function RiderMarkerWrapper({
  rider,
  map,
  onClick,
}: {
  rider: RiderPosition;
  map: maplibregl.Map;
  onClick: (r: RiderPosition) => void;
}) {
  useRiderMarker({ rider, map, onClick });
  return null;
}
