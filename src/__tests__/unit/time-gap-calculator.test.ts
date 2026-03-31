import { describe, it, expect, beforeEach } from "vitest";
import { ProgressionHistory } from "@/lib/time-gap/progression-history";
import { computeTimeGaps } from "@/lib/time-gap/calculator";

describe("computeTimeGaps", () => {
  let history: ProgressionHistory;

  beforeEach(() => {
    history = new ProgressionHistory();
  });

  it("returns empty array for empty history", () => {
    expect(computeTimeGaps(history)).toEqual([]);
  });

  it("leader alone → timeGapToLeader is null", () => {
    history.addEntry("r1", 0, 0);
    history.addEntry("r1", 5000, 300_000);

    const gaps = computeTimeGaps(history);
    expect(gaps).toHaveLength(1);
    expect(gaps[0].riderId).toBe("r1");
    expect(gaps[0].timeGapToLeader).toBeNull();
  });

  it("two riders — correct time gap", () => {
    // Rider A: 0m@0s, 5000m@300s (300sec = 5min)
    history.addEntry("rA", 0, 0);
    history.addEntry("rA", 5000, 300_000);

    // Rider B: 0m@0s, 3000m@300s (at 300s, B is at 3000m)
    history.addEntry("rB", 0, 0);
    history.addEntry("rB", 3000, 300_000);

    const gaps = computeTimeGaps(history);
    expect(gaps).toHaveLength(2);

    // Leader is rA (farthest at 5000m)
    const leader = gaps.find((g) => g.riderId === "rA")!;
    expect(leader.timeGapToLeader).toBeNull();
    expect(leader.distanceFromStart).toBe(5000);

    // rB gap: at rB's distance (3000m), leader A was there at:
    // A: 0→5000m in 300s, so at 3000m A was at 3000/5000*300000 = 180000ms
    // rB arrived at 3000m at 300000ms → gap = (300000-180000)/1000 = 120s
    const follower = gaps.find((g) => g.riderId === "rB")!;
    expect(follower.timeGapToLeader).toBeCloseTo(120, 0);
  });

  it("three riders — adjacent gaps correct", () => {
    // A: linear 0→10000m in 600s
    history.addEntry("rA", 0, 0);
    history.addEntry("rA", 10000, 600_000);

    // B: linear 0→7000m in 600s
    history.addEntry("rB", 0, 0);
    history.addEntry("rB", 7000, 600_000);

    // C: linear 0→4000m in 600s
    history.addEntry("rC", 0, 0);
    history.addEntry("rC", 4000, 600_000);

    const gaps = computeTimeGaps(history);
    expect(gaps).toHaveLength(3);

    // Sorted: rA (10000), rB (7000), rC (4000)
    expect(gaps[0].riderId).toBe("rA");
    expect(gaps[1].riderId).toBe("rB");
    expect(gaps[2].riderId).toBe("rC");

    // rA: no one ahead, rB behind
    expect(gaps[0].riderAheadId).toBeNull();
    expect(gaps[0].riderBehindId).toBe("rB");

    // rB: rA ahead, rC behind
    expect(gaps[1].riderAheadId).toBe("rA");
    expect(gaps[1].riderBehindId).toBe("rC");

    // rC: rB ahead, no one behind
    expect(gaps[2].riderAheadId).toBe("rB");
    expect(gaps[2].riderBehindId).toBeNull();
  });

  it("handles overtaking — new leader", () => {
    // Initially A leads, then B overtakes
    history.addEntry("rA", 0, 0);
    history.addEntry("rA", 3000, 300_000);

    history.addEntry("rB", 0, 10_000);
    history.addEntry("rB", 5000, 300_000);

    const gaps = computeTimeGaps(history);
    // B is now leader (5000 > 3000)
    expect(gaps[0].riderId).toBe("rB");
    expect(gaps[0].timeGapToLeader).toBeNull();
    expect(gaps[1].riderId).toBe("rA");
    expect(gaps[1].timeGapToLeader).not.toBeNull();
  });

  it("same position → gap is 0", () => {
    history.addEntry("rA", 0, 0);
    history.addEntry("rA", 5000, 300_000);

    // rB at exactly the same distance and time
    history.addEntry("rB", 0, 0);
    history.addEntry("rB", 5000, 300_000);

    const gaps = computeTimeGaps(history);
    // Both at 5000m, first one is "leader" by sort order, second gets 0 gap
    const follower = gaps[1];
    expect(follower.timeGapToLeader).toBeCloseTo(0, 0);
  });

  it("returns null gap when leader has no data at rider's distance", () => {
    // Leader started later, has no history at rider's distance
    history.addEntry("rA", 5000, 500_000);

    history.addEntry("rB", 2000, 300_000);

    const gaps = computeTimeGaps(history);
    // rA is leader (5000 > 2000)
    // At rB's distance (2000m), rA has no data (only at 5000m)
    const follower = gaps.find((g) => g.riderId === "rB")!;
    expect(follower.timeGapToLeader).toBeNull();
  });

  it("rider with no entries is excluded", () => {
    history.addEntry("rA", 1000, 100_000);
    // rB has no entries (empty history for that rider)
    const gaps = computeTimeGaps(history);
    expect(gaps).toHaveLength(1);
  });

  it("gap computed with interpolation at non-exact distances", () => {
    // Leader A: 0m@0s, 1000m@60s, 2000m@120s
    history.addEntry("rA", 0, 0);
    history.addEntry("rA", 1000, 60_000);
    history.addEntry("rA", 2000, 120_000);

    // Follower B at 1500m@150s
    history.addEntry("rB", 0, 0);
    history.addEntry("rB", 1500, 150_000);

    const gaps = computeTimeGaps(history);
    const follower = gaps.find((g) => g.riderId === "rB")!;

    // Leader A at 1500m: interpolate between 1000@60s and 2000@120s
    // fraction = (1500-1000)/(2000-1000) = 0.5
    // leaderTime = 60000 + 0.5*(120000-60000) = 90000ms
    // gap = (150000 - 90000)/1000 = 60s
    expect(follower.timeGapToLeader).toBeCloseTo(60, 0);
  });

  it("behind gap is computed from correct perspective", () => {
    // A at 2000m@120s, B at 1000m@120s
    history.addEntry("rA", 0, 0);
    history.addEntry("rA", 2000, 120_000);

    history.addEntry("rB", 0, 0);
    history.addEntry("rB", 1000, 120_000);

    const gaps = computeTimeGaps(history);
    const leader = gaps.find((g) => g.riderId === "rA")!;

    // Behind gap: at rB's distance (1000m), what was rA's timestamp?
    // A: 0→2000m in 120s, at 1000m = 60000ms. B arrived at 120000ms.
    // riderBehindGap = (120000-60000)/1000 = 60s
    expect(leader.riderBehindGap).toBeCloseTo(60, 0);
  });
});
