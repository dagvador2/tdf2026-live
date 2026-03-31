import { describe, it, expect } from "vitest";
import {
  isInsideGeofence,
  detectGeofenceHits,
  GeofenceCheckpoint,
} from "@/lib/gps/geofence";

const cp: GeofenceCheckpoint = {
  id: "cp1",
  latitude: 45.05,
  longitude: 5.72,
  radiusM: 50,
  order: 1,
};

describe("isInsideGeofence", () => {
  it("point inside radius → true", () => {
    expect(isInsideGeofence(45.05, 5.72, cp)).toBe(true);
  });

  it("point far outside radius → false", () => {
    expect(isInsideGeofence(45.06, 5.72, cp)).toBe(false);
  });

  it("point on the edge → true (inclusive)", () => {
    // ~49m north of checkpoint (just within 50m radius)
    expect(isInsideGeofence(45.05044, 5.72, cp)).toBe(true);
  });
});

describe("detectGeofenceHits", () => {
  const checkpoints: GeofenceCheckpoint[] = [
    { id: "start", latitude: 45.05, longitude: 5.72, radiusM: 50, order: 1 },
    { id: "col", latitude: 45.10, longitude: 5.72, radiusM: 100, order: 2 },
    {
      id: "finish",
      latitude: 45.15,
      longitude: 5.72,
      radiusM: 50,
      order: 3,
    },
  ];

  it("detects checkpoint hit for matching position", () => {
    const positions = [
      { latitude: 45.05, longitude: 5.72, timestamp: new Date("2026-07-20T10:00:00Z") },
    ];
    const hits = detectGeofenceHits(positions, checkpoints, new Set());
    expect(hits).toHaveLength(1);
    expect(hits[0].checkpointId).toBe("start");
  });

  it("skips already-passed checkpoints", () => {
    const positions = [
      { latitude: 45.05, longitude: 5.72, timestamp: new Date("2026-07-20T10:00:00Z") },
    ];
    const hits = detectGeofenceHits(positions, checkpoints, new Set(["start"]));
    expect(hits).toHaveLength(0);
  });

  it("respects checkpoint order — must pass start before col", () => {
    const positions = [
      { latitude: 45.10, longitude: 5.72, timestamp: new Date("2026-07-20T10:30:00Z") },
    ];
    const hits = detectGeofenceHits(positions, checkpoints, new Set());
    // Position matches "col" but start hasn't been passed → no hit
    expect(hits).toHaveLength(0);
  });

  it("handles late offline positions by sorting by timestamp", () => {
    const positions = [
      // Arrives later in batch but earlier in time
      { latitude: 45.05, longitude: 5.72, timestamp: new Date("2026-07-20T10:00:00Z") },
      { latitude: 45.10, longitude: 5.72, timestamp: new Date("2026-07-20T10:30:00Z") },
    ];
    const hits = detectGeofenceHits(positions, checkpoints, new Set());
    expect(hits).toHaveLength(2);
    expect(hits[0].checkpointId).toBe("start");
    expect(hits[1].checkpointId).toBe("col");
  });

  it("no hits when no positions match", () => {
    const positions = [
      { latitude: 46.0, longitude: 6.0, timestamp: new Date("2026-07-20T10:00:00Z") },
    ];
    const hits = detectGeofenceHits(positions, checkpoints, new Set());
    expect(hits).toHaveLength(0);
  });
});
