"use client";

import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import type { RiderPosition } from "@/types";

interface RiderMarkerProps {
  rider: RiderPosition;
  map: maplibregl.Map;
  onClick?: (rider: RiderPosition) => void;
}

export function useRiderMarker({ rider, map, onClick }: RiderMarkerProps) {
  const markerRef = useRef<maplibregl.Marker | null>(null);

  useEffect(() => {
    const el = document.createElement("div");
    el.className = "rider-marker";
    el.style.cssText = `
      width: 24px;
      height: 24px;
      border-radius: 50%;
      background: ${rider.teamColor};
      border: 3px solid white;
      box-shadow: 0 2px 6px rgba(0,0,0,0.35);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 10px;
      font-weight: bold;
      color: white;
      font-family: system-ui;
      transition: transform 0.3s ease;
    `;
    el.textContent = rider.firstName.charAt(0);
    el.title = rider.firstName;

    if (onClick) {
      el.addEventListener("click", () => onClick(rider));
    }

    const marker = new maplibregl.Marker({ element: el })
      .setLngLat([rider.longitude, rider.latitude])
      .addTo(map);

    markerRef.current = marker;

    return () => {
      marker.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map]);

  // Animate marker position updates
  useEffect(() => {
    if (markerRef.current) {
      markerRef.current.setLngLat([rider.longitude, rider.latitude]);
    }
  }, [rider.latitude, rider.longitude]);

  return markerRef;
}
