"use client";

import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { MAP_CONFIG, getStyleUrl } from "@/lib/map/config";

interface MapContainerProps {
  coordinates?: [number, number][];
  checkpoints?: {
    lat: number;
    lng: number;
    name: string;
    type: string;
    kmFromStart: number;
  }[];
  className?: string;
  children?: React.ReactNode;
  onMapReady?: (map: maplibregl.Map) => void;
}

export function MapContainer({
  coordinates,
  checkpoints,
  className = "h-[400px] w-full",
  onMapReady,
}: MapContainerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [loaded, setLoaded] = useState(false);

  const maptilerKey = process.env.NEXT_PUBLIC_MAPTILER_KEY || "";

  useEffect(() => {
    if (!containerRef.current || !maptilerKey) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: getStyleUrl(maptilerKey),
      center: MAP_CONFIG.defaultCenter,
      zoom: MAP_CONFIG.defaultZoom,
      attributionControl: false,
    });

    map.addControl(new maplibregl.NavigationControl(), "top-right");
    map.addControl(new maplibregl.AttributionControl({ compact: true }));

    map.on("load", () => {
      mapRef.current = map;
      setLoaded(true);
      onMapReady?.(map);
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [maptilerKey]);

  // Add GPX trace
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !loaded || !coordinates || coordinates.length === 0) return;

    const geojson: GeoJSON.Feature<GeoJSON.LineString> = {
      type: "Feature",
      properties: {},
      geometry: {
        type: "LineString",
        coordinates: coordinates.map(([lng, lat]) => [lng, lat]),
      },
    };

    if (map.getSource("gpx-trace")) {
      (map.getSource("gpx-trace") as maplibregl.GeoJSONSource).setData(geojson);
    } else {
      map.addSource("gpx-trace", { type: "geojson", data: geojson });

      map.addLayer({
        id: "gpx-trace-outline",
        type: "line",
        source: "gpx-trace",
        paint: {
          "line-color": MAP_CONFIG.traceOutlineColor,
          "line-width": MAP_CONFIG.traceOutlineWidth,
        },
      });

      map.addLayer({
        id: "gpx-trace-line",
        type: "line",
        source: "gpx-trace",
        paint: {
          "line-color": MAP_CONFIG.traceColor,
          "line-width": MAP_CONFIG.traceWidth,
        },
      });
    }

    // Auto-zoom to trace
    const bounds = new maplibregl.LngLatBounds();
    coordinates.forEach(([lng, lat]) => bounds.extend([lng, lat]));
    map.fitBounds(bounds, { padding: 40 });
  }, [coordinates, loaded]);

  // Add checkpoint markers
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !loaded || !checkpoints) return;

    // Remove existing markers
    const existing = document.querySelectorAll(".checkpoint-marker");
    existing.forEach((el) => el.remove());

    checkpoints.forEach((cp) => {
      const el = document.createElement("div");
      el.className = "checkpoint-marker";
      el.style.cssText = getCheckpointStyle(cp.type);
      el.title = cp.name;

      new maplibregl.Marker({ element: el })
        .setLngLat([cp.lng, cp.lat])
        .setPopup(
          new maplibregl.Popup({ offset: 12 }).setHTML(
            `<div style="font-family:system-ui;font-size:13px">
              <strong>${cp.name}</strong><br/>
              <span style="color:#666">${cp.kmFromStart} km</span>
            </div>`
          )
        )
        .addTo(map);
    });
  }, [checkpoints, loaded]);

  if (!maptilerKey) {
    return (
      <div className={`flex items-center justify-center rounded-lg bg-muted ${className}`}>
        <p className="text-sm text-muted-foreground">
          Clé MapTiler manquante — configurez NEXT_PUBLIC_MAPTILER_KEY
        </p>
      </div>
    );
  }

  return <div ref={containerRef} className={`rounded-lg ${className}`} />;
}

function getCheckpointStyle(type: string): string {
  const base = "width:14px;height:14px;border-radius:50%;border:2px solid white;cursor:pointer;box-shadow:0 1px 3px rgba(0,0,0,0.3);";
  switch (type) {
    case "start":
      return base + "background:#8DB600;";
    case "finish":
      return base + "background:#D32F2F;";
    case "col":
      return base + "background:#E88B00;width:16px;height:16px;border-radius:2px;transform:rotate(45deg);";
    case "sprint":
      return base + "background:#0055A4;";
    default:
      return base + "background:#666;";
  }
}
