import { describe, it, expect } from "vitest";
import { projectOnPolyline } from "@/lib/gpx/projection";
import type { GPXPoint } from "@/lib/gpx/parser";

const POLYLINE: GPXPoint[] = [
  { lat: 45.0, lng: 6.0, ele: 200 },
  { lat: 45.01, lng: 6.0, ele: 300 },
  { lat: 45.02, lng: 6.0, ele: 400 },
  { lat: 45.02, lng: 6.01, ele: 500 },
];

describe("projectOnPolyline", () => {
  it("projects a point at the start of the polyline", () => {
    const result = projectOnPolyline(45.0, 6.0, POLYLINE);
    expect(result.distanceFromStart).toBeCloseTo(0, -1);
  });

  it("projects a point near the middle of the polyline", () => {
    const result = projectOnPolyline(45.01, 6.0, POLYLINE);
    expect(result.distanceFromStart).toBeGreaterThan(500);
    expect(result.segmentIndex).toBeLessThanOrEqual(1);
  });

  it("projects a point at the end of the polyline", () => {
    const { distanceFromStart } = projectOnPolyline(45.02, 6.01, POLYLINE);
    expect(distanceFromStart).toBeGreaterThan(2000);
  });

  it("projects a point off the polyline to the nearest segment", () => {
    const result = projectOnPolyline(45.005, 6.001, POLYLINE);
    expect(result.distanceFromStart).toBeGreaterThan(0);
    expect(result.nearestPoint.lat).toBeCloseTo(45.005, 2);
  });

  it("handles empty polyline", () => {
    const result = projectOnPolyline(45.0, 6.0, []);
    expect(result.distanceFromStart).toBe(0);
  });

  it("handles single-point polyline", () => {
    const result = projectOnPolyline(45.0, 6.0, [POLYLINE[0]]);
    expect(result.distanceFromStart).toBe(0);
  });

  it("returns the correct segment index", () => {
    const result = projectOnPolyline(45.02, 6.005, POLYLINE);
    expect(result.segmentIndex).toBe(2); // last segment
  });
});
