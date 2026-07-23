import { describe, it, expect } from "vitest";
import {
  computeStageResults,
  rankStageResults,
  computeTeamTTResults,
  computeTeamStageRanking,
  computeGeneralClassification,
  computeClimberClassification,
  computePastisIndividualRanking,
  computePastisTeamRanking,
  applyTeamTTTime,
  computeStageK,
  computeTeamClassification,
  rerankGC,
  StageTimeRecord,
  RankedResult,
  PastisEvent,
  GCEntry,
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

describe("applyTeamTTTime", () => {
  it("gives every rider of a team the K-th rider's time", () => {
    const results = [
      { riderId: "r1", teamId: "t1", elapsedMs: 100_000 },
      { riderId: "r2", teamId: "t1", elapsedMs: 110_000 },
      { riderId: "r3", teamId: "t1", elapsedMs: 120_000 },
      { riderId: "r4", teamId: "t2", elapsedMs: 90_000 },
      { riderId: "r5", teamId: "t2", elapsedMs: 130_000 },
    ];

    const adjusted = applyTeamTTTime(results, 3);
    // t1 : temps du 3e = 120_000 pour tous ; t2 (2 coureurs) : temps du 2e = 130_000
    for (const id of ["r1", "r2", "r3"]) {
      expect(adjusted.find((r) => r.riderId === id)!.elapsedMs).toBe(120_000);
    }
    for (const id of ["r4", "r5"]) {
      expect(adjusted.find((r) => r.riderId === id)!.elapsedMs).toBe(130_000);
    }
  });

  it("with more riders than K, takes the K-th (not the last)", () => {
    const results = [
      { riderId: "r1", teamId: "t1", elapsedMs: 100_000 },
      { riderId: "r2", teamId: "t1", elapsedMs: 110_000 },
      { riderId: "r3", teamId: "t1", elapsedMs: 200_000 },
    ];
    const adjusted = applyTeamTTTime(results, 2);
    expect(adjusted.every((r) => r.elapsedMs === 110_000)).toBe(true);
  });
});

describe("computeStageK", () => {
  it("returns the minimum presence across teams", () => {
    const k = computeStageK(
      new Map([
        ["t1", 5],
        ["t2", 6],
        ["t3", 5],
        ["t4", 7],
      ])
    );
    expect(k).toBe(5);
  });

  it("ignores teams with zero present riders", () => {
    const k = computeStageK(
      new Map([
        ["t1", 6],
        ["t2", 0],
        ["t3", 7],
      ])
    );
    expect(k).toBe(6);
  });

  it("returns 0 when nobody is present", () => {
    expect(computeStageK(new Map())).toBe(0);
    expect(computeStageK(new Map([["t1", 0]]))).toBe(0);
  });
});

describe("computeTeamClassification", () => {
  it("sums only the K best times per stage (sacrificed riders excluded)", () => {
    const gc = computeTeamClassification([
      {
        type: "road",
        k: 2,
        results: [
          { riderId: "r1", teamId: "t1", elapsedMs: 100_000 },
          { riderId: "r2", teamId: "t1", elapsedMs: 110_000 },
          { riderId: "r3", teamId: "t1", elapsedMs: 999_000 }, // sacrifié
          { riderId: "r4", teamId: "t2", elapsedMs: 105_000 },
          { riderId: "r5", teamId: "t2", elapsedMs: 110_000 },
        ],
      },
    ]);

    const t1 = gc.find((e) => e.teamId === "t1")!;
    const t2 = gc.find((e) => e.teamId === "t2")!;
    expect(t1.totalMs).toBe(210_000);
    expect(t2.totalMs).toBe(215_000);
    expect(t1.rank).toBe(1);
    expect(t2.gapMs).toBe(5_000);
  });

  it("team TT counts as K-th rider time × K", () => {
    const gc = computeTeamClassification([
      {
        type: "team_tt",
        k: 3,
        results: [
          { riderId: "r1", teamId: "t1", elapsedMs: 100_000 },
          { riderId: "r2", teamId: "t1", elapsedMs: 110_000 },
          { riderId: "r3", teamId: "t1", elapsedMs: 120_000 },
          { riderId: "r4", teamId: "t2", elapsedMs: 90_000 },
          { riderId: "r5", teamId: "t2", elapsedMs: 95_000 },
          { riderId: "r6", teamId: "t2", elapsedMs: 125_000 },
        ],
      },
    ]);

    // t1 : 120_000 × 3 = 360_000 ; t2 : 125_000 × 3 = 375_000
    expect(gc.find((e) => e.teamId === "t1")!.totalMs).toBe(360_000);
    expect(gc.find((e) => e.teamId === "t2")!.totalMs).toBe(375_000);
  });

  it("accumulates stages and ranks teams with more stages first", () => {
    const stage = (teamIds: string[], base: number) => ({
      type: "road",
      k: 1,
      results: teamIds.map((teamId, i) => ({
        riderId: `${teamId}-r`,
        teamId,
        elapsedMs: base + i * 1_000,
      })),
    });

    const gc = computeTeamClassification([
      stage(["t1", "t2"], 100_000),
      stage(["t1"], 100_000), // t2 absent de l'étape 2
    ]);

    expect(gc[0].teamId).toBe("t1");
    expect(gc[0].stagesCounted).toBe(2);
    expect(gc[1].teamId).toBe("t2");
    expect(gc[1].stagesCounted).toBe(1);
  });

  it("mode 'mean' = moyenne de tous les coureurs × k", () => {
    const gc = computeTeamClassification([
      {
        type: "mountain",
        k: 3,
        mode: "mean",
        results: [
          { riderId: "r1", teamId: "t1", elapsedMs: 100_000 },
          { riderId: "r2", teamId: "t1", elapsedMs: 200_000 },
          { riderId: "r3", teamId: "t1", elapsedMs: 300_000 },
          { riderId: "r4", teamId: "t1", elapsedMs: 600_000 }, // compte aussi (moyenne)
          { riderId: "r5", teamId: "t2", elapsedMs: 150_000 },
          { riderId: "r6", teamId: "t2", elapsedMs: 250_000 },
          { riderId: "r7", teamId: "t2", elapsedMs: 350_000 },
        ],
      },
    ]);
    // t1 : moyenne (100+200+300+600)/4 = 300k × 3 = 900k
    // t2 : moyenne (150+250+350)/3 = 250k × 3 = 750k
    expect(gc.find((e) => e.teamId === "t2")!.totalMs).toBe(750_000);
    expect(gc.find((e) => e.teamId === "t1")!.totalMs).toBe(900_000);
    expect(gc[0].teamId).toBe("t2");
  });

  it("mode 'mean' inclut les lents alors que 'sum' top-k les ignore", () => {
    const results = [
      { riderId: "a1", teamId: "A", elapsedMs: 100_000 },
      { riderId: "a2", teamId: "A", elapsedMs: 100_000 },
      { riderId: "a3", teamId: "A", elapsedMs: 900_000 }, // traînard
      { riderId: "b1", teamId: "B", elapsedMs: 150_000 },
      { riderId: "b2", teamId: "B", elapsedMs: 150_000 },
    ];
    // sum top-2 : A = 200k (traînard ignoré) → A gagne
    const sum = computeTeamClassification([{ type: "mountain", k: 2, mode: "sum", results }]);
    expect(sum[0].teamId).toBe("A");
    // mean ×2 : A = (100+100+900)/3×2 ≈ 733k, B = 150×2 = 300k → B gagne
    const mean = computeTeamClassification([{ type: "mountain", k: 2, mode: "mean", results }]);
    expect(mean[0].teamId).toBe("B");
  });

  it("skips stages with k=0 and never produces NaN", () => {
    const gc = computeTeamClassification([
      { type: "road", k: 0, results: [] },
      {
        type: "team_tt",
        k: 5,
        results: [{ riderId: "r1", teamId: "t1", elapsedMs: 100_000 }],
      },
    ]);
    // Équipe à 1 coureur sur un CLM K=5 : temps du 1er (plafonné) × 5
    expect(gc).toHaveLength(1);
    expect(gc[0].totalMs).toBe(500_000);
    expect(Number.isNaN(gc[0].totalMs)).toBe(false);
  });
});

describe("rerankGC", () => {
  it("recomputes ranks and gaps on a filtered subset", () => {
    const entries: GCEntry[] = [
      { riderId: "r2", teamId: "t1", totalMs: 220_000, stagesCompleted: 2, rank: 2, gapMs: 20_000 },
      { riderId: "r4", teamId: "t2", totalMs: 260_000, stagesCompleted: 2, rank: 4, gapMs: 60_000 },
    ];
    const reranked = rerankGC(entries);
    expect(reranked[0]).toMatchObject({ riderId: "r2", rank: 1, gapMs: 0 });
    expect(reranked[1]).toMatchObject({ riderId: "r4", rank: 2, gapMs: 40_000 });
  });

  it("handles empty input", () => {
    expect(rerankGC([])).toEqual([]);
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

describe("computePastisIndividualRanking", () => {
  const ev = (riderId: string, teamId: string, quantity = 1): PastisEvent => ({
    riderId,
    teamId,
    quantity,
  });

  it("sums quantities per rider and ranks descending", () => {
    const ranking = computePastisIndividualRanking([
      ev("r1", "t1"),
      ev("r1", "t1"),
      ev("r1", "t1"),
      ev("r2", "t2", 5),
      ev("r3", "t1"),
    ]);

    expect(ranking[0]).toMatchObject({ riderId: "r2", count: 5, rank: 1 });
    expect(ranking[1]).toMatchObject({ riderId: "r1", count: 3, rank: 2 });
    expect(ranking[2]).toMatchObject({ riderId: "r3", count: 1, rank: 3 });
  });

  it("shares the rank for ties (1, 2, 2, 4)", () => {
    const ranking = computePastisIndividualRanking([
      ev("r1", "t1", 10),
      ev("r2", "t2", 4),
      ev("r3", "t1", 4),
      ev("r4", "t2", 1),
    ]);

    expect(ranking.map((e) => e.rank)).toEqual([1, 2, 2, 4]);
  });

  it("returns an empty array when there are no events", () => {
    expect(computePastisIndividualRanking([])).toEqual([]);
  });
});

describe("computePastisTeamRanking", () => {
  const ev = (riderId: string, teamId: string, quantity = 1): PastisEvent => ({
    riderId,
    teamId,
    quantity,
  });

  it("aggregates all riders of a team and ranks descending", () => {
    const ranking = computePastisTeamRanking([
      ev("r1", "t1", 3),
      ev("r2", "t1", 2),
      ev("r3", "t2", 4),
    ]);

    // t1 = 5, t2 = 4
    expect(ranking[0]).toMatchObject({ teamId: "t1", count: 5, rank: 1 });
    expect(ranking[1]).toMatchObject({ teamId: "t2", count: 4, rank: 2 });
  });
});
