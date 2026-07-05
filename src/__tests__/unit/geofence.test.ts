import { describe, it, expect } from "vitest";
import {
  isInsideGeofence,
  detectGeofenceHits,
  computeArmed,
  GeofenceCheckpoint,
} from "@/lib/gps/geofence";

const cp: GeofenceCheckpoint = {
  id: "cp1",
  latitude: 45.05,
  longitude: 5.72,
  radiusM: 50,
  order: 1,
  kmFromStart: 10,
  type: "sprint",
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
  // Loop stage like the real ones: start and finish zones overlap
  // (finish is ~11m north of the start), col at ~5.5km as the crow flies.
  const checkpoints: GeofenceCheckpoint[] = [
    {
      id: "start",
      latitude: 45.05,
      longitude: 5.72,
      radiusM: 80,
      order: 1,
      kmFromStart: 0,
      type: "start",
    },
    {
      id: "col",
      latitude: 45.1,
      longitude: 5.72,
      radiusM: 150,
      order: 2,
      kmFromStart: 20,
      type: "col",
    },
    {
      id: "finish",
      latitude: 45.0501,
      longitude: 5.72,
      radiusM: 80,
      order: 3,
      kmFromStart: 40,
      type: "finish",
    },
  ];

  const at = (iso: string) => new Date(iso);
  const noPrior = { priorRecords: [], armed: new Set<string>() };

  it("records the start immediately, without arming", () => {
    const positions = [
      { latitude: 45.05, longitude: 5.72, timestamp: at("2026-07-20T10:00:00Z") },
    ];
    const { hits } = detectGeofenceHits(positions, checkpoints, {
      ...noPrior,
      firstPositionAt: at("2026-07-20T10:00:00Z"),
    });
    expect(hits).toHaveLength(1);
    expect(hits[0].checkpointId).toBe("start");
  });

  it("never records the finish for a rider waiting on the shared start/finish line", () => {
    // Rider stands on the line for 3 hours — longer than any time gate.
    const positions = Array.from({ length: 10 }, (_, i) => ({
      latitude: 45.05,
      longitude: 5.72,
      timestamp: new Date(Date.UTC(2026, 6, 20, 7 + i / 4, (i % 4) * 15)),
    }));
    const { hits } = detectGeofenceHits(positions, checkpoints, {
      priorRecords: [{ checkpointId: "start", timestamp: at("2026-07-20T07:00:00Z") }],
      armed: new Set<string>(),
      firstPositionAt: at("2026-07-20T07:00:00Z"),
    });
    expect(hits).toHaveLength(0);
  });

  it("records an armed finish once the time gate has elapsed", () => {
    // 40 km at 50 km/h → gate of 48 min after the start record.
    const positions = [
      { latitude: 45.0501, longitude: 5.72, timestamp: at("2026-07-20T11:00:00Z") },
    ];
    const { hits } = detectGeofenceHits(positions, checkpoints, {
      priorRecords: [{ checkpointId: "start", timestamp: at("2026-07-20T10:00:00Z") }],
      armed: new Set(["finish"]),
      firstPositionAt: at("2026-07-20T09:55:00Z"),
    });
    expect(hits).toHaveLength(1);
    expect(hits[0].checkpointId).toBe("finish");
  });

  it("time gate blocks an armed finish that comes back too early", () => {
    // Back on the line 20 min after the start: physically impossible (gate 48 min).
    const positions = [
      { latitude: 45.0501, longitude: 5.72, timestamp: at("2026-07-20T10:20:00Z") },
    ];
    const { hits } = detectGeofenceHits(positions, checkpoints, {
      priorRecords: [{ checkpointId: "start", timestamp: at("2026-07-20T10:00:00Z") }],
      armed: new Set(["finish"]),
      firstPositionAt: at("2026-07-20T09:55:00Z"),
    });
    expect(hits).toHaveLength(0);
  });

  it("a missed intermediate checkpoint does not block the following ones", () => {
    // The col was never recorded (GPS gap) but the finish still counts.
    const positions = [
      { latitude: 45.0501, longitude: 5.72, timestamp: at("2026-07-20T12:00:00Z") },
    ];
    const { hits } = detectGeofenceHits(positions, checkpoints, {
      priorRecords: [{ checkpointId: "start", timestamp: at("2026-07-20T10:00:00Z") }],
      armed: new Set(["col", "finish"]),
      firstPositionAt: at("2026-07-20T09:55:00Z"),
    });
    expect(hits).toHaveLength(1);
    expect(hits[0].checkpointId).toBe("finish");
  });

  it("skips already-passed checkpoints", () => {
    const positions = [
      { latitude: 45.05, longitude: 5.72, timestamp: at("2026-07-20T10:00:00Z") },
    ];
    const { hits } = detectGeofenceHits(positions, checkpoints, {
      priorRecords: [{ checkpointId: "start", timestamp: at("2026-07-20T09:00:00Z") }],
      armed: new Set<string>(),
      firstPositionAt: at("2026-07-20T09:00:00Z"),
    });
    expect(hits).toHaveLength(0);
  });

  it("arms checkpoints seen from afar and reports them", () => {
    // Rider at the start is ~5.5km from the col → arms col and finish? No:
    // the finish is 11m away, still inside its arm distance → only col armed.
    const positions = [
      { latitude: 45.05, longitude: 5.72, timestamp: at("2026-07-20T10:00:00Z") },
    ];
    const { newlyArmed } = detectGeofenceHits(positions, checkpoints, {
      ...noPrior,
      firstPositionAt: at("2026-07-20T10:00:00Z"),
    });
    expect(newlyArmed).toEqual(["col"]);
  });

  it("handles late offline positions by sorting by timestamp", () => {
    const positions = [
      // Arrives later in the batch but earlier in time
      { latitude: 45.05, longitude: 5.72, timestamp: at("2026-07-20T10:00:00Z") },
      { latitude: 45.1, longitude: 5.72, timestamp: at("2026-07-20T10:30:00Z") },
    ];
    const { hits } = detectGeofenceHits(positions, checkpoints, {
      ...noPrior,
      firstPositionAt: at("2026-07-20T10:00:00Z"),
    });
    // Start hit at 10:00, which arms the col; col gate is 24 min → 10:30 passes.
    expect(hits).toHaveLength(2);
    expect(hits[0].checkpointId).toBe("start");
    expect(hits[1].checkpointId).toBe("col");
  });

  it("no hits when no positions match", () => {
    const positions = [
      { latitude: 46.0, longitude: 6.0, timestamp: at("2026-07-20T10:00:00Z") },
    ];
    const { hits } = detectGeofenceHits(positions, checkpoints, {
      ...noPrior,
      firstPositionAt: at("2026-07-20T10:00:00Z"),
    });
    expect(hits).toHaveLength(0);
  });

  describe("computeArmed", () => {
    it("arms checkpoints the rider has been far from, not the others", () => {
      const positions = [
        { latitude: 45.05, longitude: 5.72 }, // on the start line
        { latitude: 45.07, longitude: 5.72 }, // ~2.2km away, far from everything
      ];
      const armed = computeArmed(positions, checkpoints);
      expect(armed.has("start")).toBe(true);
      expect(armed.has("col")).toBe(true);
      expect(armed.has("finish")).toBe(true);
    });

    it("arms nothing for a rider who never left the start area", () => {
      const positions = [{ latitude: 45.05, longitude: 5.72 }];
      const armed = computeArmed(positions, checkpoints);
      expect(armed.has("finish")).toBe(false);
      expect(armed.has("start")).toBe(false);
      expect(armed.has("col")).toBe(true); // 5.5km away
    });
  });
});
