import { describe, it, expect } from "vitest";
import { parseGPX } from "@/lib/gpx/parser";

const SAMPLE_GPX = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1">
  <trk>
    <trkseg>
      <trkpt lat="45.3626" lon="5.5911">
        <ele>290</ele>
      </trkpt>
      <trkpt lat="45.3567" lon="5.6823">
        <ele>582</ele>
      </trkpt>
      <trkpt lat="45.3881" lon="5.7349">
        <ele>410</ele>
      </trkpt>
      <trkpt lat="45.3084" lon="5.7695">
        <ele>1434</ele>
      </trkpt>
    </trkseg>
  </trk>
</gpx>`;

describe("parseGPX", () => {
  it("extracts correct number of coordinates", () => {
    const result = parseGPX(SAMPLE_GPX);
    expect(result.coordinates).toHaveLength(4);
  });

  it("extracts lat/lng/ele correctly", () => {
    const result = parseGPX(SAMPLE_GPX);
    expect(result.coordinates[0]).toEqual({ lat: 45.3626, lng: 5.5911, ele: 290 });
  });

  it("computes elevation profile with correct number of points", () => {
    const result = parseGPX(SAMPLE_GPX);
    expect(result.elevationProfile).toHaveLength(4);
    expect(result.elevationProfile[0].distance).toBe(0);
  });

  it("computes total distance > 0", () => {
    const result = parseGPX(SAMPLE_GPX);
    expect(result.totalDistance).toBeGreaterThan(0);
    // Roughly 20+ km for these coordinates
    expect(result.totalDistance).toBeGreaterThan(10_000);
  });

  it("computes elevation gain correctly (only positive diffs)", () => {
    const result = parseGPX(SAMPLE_GPX);
    // 290→582 = +292, 582→410 = 0 (down), 410→1434 = +1024 → total ~1316
    expect(result.totalElevationGain).toBeCloseTo(1316, 0);
  });

  it("finds min and max elevation", () => {
    const result = parseGPX(SAMPLE_GPX);
    expect(result.minElevation).toBe(290);
    expect(result.maxElevation).toBe(1434);
  });

  it("handles empty GPX gracefully", () => {
    const result = parseGPX("<gpx></gpx>");
    expect(result.coordinates).toHaveLength(0);
    expect(result.totalDistance).toBe(0);
  });

  it("handles single point GPX", () => {
    const gpx = `<gpx><trk><trkseg>
      <trkpt lat="45.0" lon="6.0"><ele>100</ele></trkpt>
    </trkseg></trk></gpx>`;
    const result = parseGPX(gpx);
    expect(result.coordinates).toHaveLength(1);
    expect(result.totalDistance).toBe(0);
    expect(result.totalElevationGain).toBe(0);
  });
});
