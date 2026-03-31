import { describe, it, expect } from "vitest";
import { filterGpsPoint, GpsPoint } from "@/lib/gps/tracker";

function makePoint(overrides: Partial<GpsPoint> = {}): GpsPoint {
  return {
    latitude: 45.05,
    longitude: 5.72,
    altitude: 1000,
    speed: 8, // m/s = ~28.8 km/h
    accuracy: 10,
    timestamp: Date.now(),
    ...overrides,
  };
}

describe("filterGpsPoint", () => {
  it("accepts a valid point with no previous point", () => {
    const point = makePoint();
    expect(filterGpsPoint(point, null)).toEqual({ accepted: true });
  });

  it("rejects point with accuracy > 50m", () => {
    const point = makePoint({ accuracy: 80 });
    const result = filterGpsPoint(point, null);
    expect(result.accepted).toBe(false);
    expect(result.reason).toBe("accuracy_too_low");
  });

  it("accepts point with accuracy exactly 50m", () => {
    const point = makePoint({ accuracy: 50 });
    expect(filterGpsPoint(point, null).accepted).toBe(true);
  });

  it("accepts point with null accuracy", () => {
    const point = makePoint({ accuracy: null });
    expect(filterGpsPoint(point, null).accepted).toBe(true);
  });

  it("rejects point with speed > 80 km/h", () => {
    const point = makePoint({ speed: 25 }); // 25 m/s = 90 km/h
    const result = filterGpsPoint(point, null);
    expect(result.accepted).toBe(false);
    expect(result.reason).toBe("speed_too_high");
  });

  it("accepts point with speed exactly 80 km/h", () => {
    const point = makePoint({ speed: 80 / 3.6 }); // exactly 80 km/h
    expect(filterGpsPoint(point, null).accepted).toBe(true);
  });

  it("accepts point with null speed", () => {
    const point = makePoint({ speed: null });
    expect(filterGpsPoint(point, null).accepted).toBe(true);
  });

  it("rejects point too close to the previous (<2m)", () => {
    const last = makePoint({ latitude: 45.05, longitude: 5.72 });
    // ~0.5m away
    const point = makePoint({ latitude: 45.050004, longitude: 5.72 });
    const result = filterGpsPoint(point, last);
    expect(result.accepted).toBe(false);
    expect(result.reason).toBe("too_close");
  });

  it("accepts point far enough from the previous", () => {
    const last = makePoint({ latitude: 45.05, longitude: 5.72 });
    // ~50m away
    const point = makePoint({ latitude: 45.0505, longitude: 5.72 });
    expect(filterGpsPoint(point, last).accepted).toBe(true);
  });
});
