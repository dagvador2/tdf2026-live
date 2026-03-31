import { describe, it, expect, beforeEach } from "vitest";
import { ProgressionHistory } from "@/lib/time-gap/progression-history";

describe("ProgressionHistory", () => {
  let history: ProgressionHistory;

  beforeEach(() => {
    history = new ProgressionHistory();
  });

  it("returns null for unknown rider", () => {
    expect(history.getTimestampAtDistance("unknown", 1000)).toBeNull();
    expect(history.getLatestDistance("unknown")).toBeNull();
    expect(history.getLatestTimestamp("unknown")).toBeNull();
  });

  it("stores and retrieves exact distance", () => {
    history.addEntry("r1", 1000, 100_000);
    expect(history.getTimestampAtDistance("r1", 1000)).toBe(100_000);
  });

  it("interpolates between two points", () => {
    history.addEntry("r1", 0, 0);
    history.addEntry("r1", 1000, 100_000);
    // At 500m → should be ~50_000 ms
    expect(history.getTimestampAtDistance("r1", 500)).toBe(50_000);
  });

  it("returns null for distance before first entry", () => {
    history.addEntry("r1", 100, 10_000);
    expect(history.getTimestampAtDistance("r1", 50)).toBeNull();
  });

  it("returns null for distance beyond last entry", () => {
    history.addEntry("r1", 0, 0);
    history.addEntry("r1", 1000, 100_000);
    expect(history.getTimestampAtDistance("r1", 2000)).toBeNull();
  });

  it("ignores entries that go backwards in distance", () => {
    history.addEntry("r1", 1000, 100_000);
    history.addEntry("r1", 500, 50_000); // should be ignored
    expect(history.getEntryCount("r1")).toBe(1);
  });

  it("tracks latest distance and timestamp", () => {
    history.addEntry("r1", 0, 0);
    history.addEntry("r1", 500, 50_000);
    history.addEntry("r1", 1200, 120_000);
    expect(history.getLatestDistance("r1")).toBe(1200);
    expect(history.getLatestTimestamp("r1")).toBe(120_000);
  });

  it("tracks multiple riders independently", () => {
    history.addEntry("r1", 1000, 100_000);
    history.addEntry("r2", 500, 60_000);
    expect(history.getRiderIds()).toContain("r1");
    expect(history.getRiderIds()).toContain("r2");
    expect(history.getLatestDistance("r1")).toBe(1000);
    expect(history.getLatestDistance("r2")).toBe(500);
  });

  it("clears all data", () => {
    history.addEntry("r1", 1000, 100_000);
    history.clear();
    expect(history.getRiderIds()).toHaveLength(0);
    expect(history.getLatestDistance("r1")).toBeNull();
  });

  it("interpolation with 3+ points uses correct bracket", () => {
    history.addEntry("r1", 0, 0);
    history.addEntry("r1", 1000, 60_000); // 0-1km in 60s
    history.addEntry("r1", 3000, 180_000); // 1-3km in 120s (slower)

    // At 2000m: bracket is [1000, 3000], fraction = 0.5
    // interpolated = 60000 + 0.5 * (180000 - 60000) = 120000
    expect(history.getTimestampAtDistance("r1", 2000)).toBe(120_000);
  });
});
