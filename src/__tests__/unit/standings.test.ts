import { describe, it, expect } from "vitest";
import {
  computeStageResults,
  rankStageResults,
  computeTeamTTResults,
  computeTeamStageRanking,
  computeGeneralClassification,
  computeClimberClassification,
  StageTimeRecord,
  RankedResult,
} from "@/lib/standings/calculator";

// Helper to make a start + finish record pair
function makeRecords(
  riderId: string,
  teamId: string,
  startMs: number,
  finishMs: number,
  status = "finished"
): StageTimeRecord[] {
  return [
    {
      riderId,
      teamId,
      checkpointType: "start",
      timestamp: startMs,
      entryStatus: status,
    },
    {
      riderId,
      teamId,
      checkpointType: "finish",
      timestamp: finishMs,
      entryStatus: status,
    },
  ];
}

describe("computeStageResults", () => {
  it("ranks riders by elapsed time", () => {
    const records = [
      ...makeRecords("r1", "t1", 0, 300_000), // 300s
      ...makeRecords("r2", "t1", 0, 200_000), // 200s — winner
      ...makeRecords("r3", "t2", 0, 400_000), // 400s
    ];
    const results = computeStageResults(records);
    expect(results[0].riderId).toBe("r2");
    expect(results[1].riderId).toBe("r1");
    expect(results[2].riderId).toBe("r3");
  });

  it("excludes DNF riders", () => {
    const records = [
      ...makeRecords("r1", "t1", 0, 300_000),
      ...makeRecords("r2", "t1", 0, 200_000, "dnf"),
    ];
    const results = computeStageResults(records);
    expect(results).toHaveLength(1);
    expect(results[0].riderId).toBe("r1");
  });

  it("excludes riders without finish", () => {
    const records: StageTimeRecord[] = [
      {
        riderId: "r1",
        teamId: "t1",
        checkpointType: "start",
        timestamp: 0,
        entryStatus: "tracking",
      },
    ];
    expect(computeStageResults(records)).toHaveLength(0);
  });
});

describe("rankStageResults", () => {
  it("computes correct gaps", () => {
    const records = [
      ...makeRecords("r1", "t1", 0, 200_000),
      ...makeRecords("r2", "t2", 0, 300_000),
    ];
    const results = computeStageResults(records);
    const ranked = rankStageResults(results);

    expect(ranked[0].rank).toBe(1);
    expect(ranked[0].gapMs).toBe(0);
    expect(ranked[1].rank).toBe(2);
    expect(ranked[1].gapMs).toBe(100_000);
  });
});

describe("computeTeamTTResults", () => {
  it("team time = Nth rider (N=3)", () => {
    const results = [
      { riderId: "r1", teamId: "t1", elapsedMs: 100_000 },
      { riderId: "r2", teamId: "t1", elapsedMs: 110_000 },
      { riderId: "r3", teamId: "t1", elapsedMs: 120_000 },
      { riderId: "r4", teamId: "t1", elapsedMs: 130_000 },
      { riderId: "r5", teamId: "t2", elapsedMs: 105_000 },
      { riderId: "r6", teamId: "t2", elapsedMs: 115_000 },
      { riderId: "r7", teamId: "t2", elapsedMs: 125_000 },
    ];

    const teamResults = computeTeamTTResults(results, 3);
    // t1: 3rd rider = 120_000
    // t2: 3rd rider = 125_000
    expect(teamResults[0].teamId).toBe("t1");
    expect(teamResults[0].elapsedMs).toBe(120_000);
    expect(teamResults[1].teamId).toBe("t2");
    expect(teamResults[1].gapMs).toBe(5_000);
  });
});

describe("computeTeamStageRanking", () => {
  it("sums top N riders per team", () => {
    const results = [
      { riderId: "r1", teamId: "t1", elapsedMs: 100_000 },
      { riderId: "r2", teamId: "t1", elapsedMs: 200_000 },
      { riderId: "r3", teamId: "t1", elapsedMs: 300_000 },
      { riderId: "r4", teamId: "t2", elapsedMs: 150_000 },
      { riderId: "r5", teamId: "t2", elapsedMs: 160_000 },
      { riderId: "r6", teamId: "t2", elapsedMs: 170_000 },
    ];

    const teamRanking = computeTeamStageRanking(results, 3);
    // t1: 100+200+300 = 600_000
    // t2: 150+160+170 = 480_000 — wins
    expect(teamRanking[0].teamId).toBe("t2");
    expect(teamRanking[0].elapsedMs).toBe(480_000);
    expect(teamRanking[1].teamId).toBe("t1");
  });
});

describe("computeGeneralClassification", () => {
  const stage1: RankedResult[] = [
    { riderId: "r1", teamId: "t1", rank: 1, elapsedMs: 200_000, gapMs: 0 },
    { riderId: "r2", teamId: "t2", rank: 2, elapsedMs: 300_000, gapMs: 100_000 },
  ];
  const stage2: RankedResult[] = [
    { riderId: "r2", teamId: "t2", rank: 1, elapsedMs: 250_000, gapMs: 0 },
    { riderId: "r1", teamId: "t1", rank: 2, elapsedMs: 350_000, gapMs: 100_000 },
  ];

  it("mode 'all' — ranks by total time", () => {
    const stageMap = new Map([
      [1, stage1],
      [2, stage2],
    ]);
    const gc = computeGeneralClassification(stageMap, 2, "all");

    // r1: 200+350 = 550, r2: 300+250 = 550 — tie, both 2 stages
    expect(gc).toHaveLength(2);
    expect(gc[0].totalMs).toBe(550_000);
  });

  it("mode 'complete_only' — excludes partial riders", () => {
    const stage1Only: RankedResult[] = [
      { riderId: "r1", teamId: "t1", rank: 1, elapsedMs: 200_000, gapMs: 0 },
      { riderId: "r3", teamId: "t1", rank: 3, elapsedMs: 400_000, gapMs: 200_000 },
    ];
    const stageMap = new Map([
      [1, stage1Only],
      [2, stage2],
    ]);
    const gc = computeGeneralClassification(stageMap, 2, "complete_only");

    // r3 only did stage1 → excluded, r1 did both stages
    expect(gc.find((e) => e.riderId === "r3")).toBeUndefined();
    expect(gc.find((e) => e.riderId === "r1")).toBeDefined();
  });
});

describe("computeClimberClassification", () => {
  it("awards points per col passage order", () => {
    const records = [
      { riderId: "r1", teamId: "t1", checkpointId: "col1", timestamp: 100_000 },
      { riderId: "r2", teamId: "t2", checkpointId: "col1", timestamp: 110_000 },
      { riderId: "r1", teamId: "t1", checkpointId: "col2", timestamp: 200_000 },
      { riderId: "r3", teamId: "t1", checkpointId: "col2", timestamp: 190_000 },
    ];

    const ranking = computeClimberClassification(records);

    // col1: r1 1st=10pts, r2 2nd=8pts
    // col2: r3 1st=10pts, r1 2nd=8pts
    // r1 total = 18, r3 = 10, r2 = 8
    expect(ranking[0].riderId).toBe("r1");
    expect(ranking[0].points).toBe(18);
    expect(ranking[1].riderId).toBe("r3");
    expect(ranking[1].points).toBe(10);
    expect(ranking[2].riderId).toBe("r2");
    expect(ranking[2].points).toBe(8);
  });
});
