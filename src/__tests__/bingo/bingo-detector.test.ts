import { describe, expect, it } from "vitest";
import { BingoAchievementType } from "@prisma/client";
import {
  BINGO_LINES,
  computeAchievementTargets,
  detectAchievements,
  obsoleteAchievements,
} from "@/features/bingo/lib/bingo-detector";

const allPositions = new Set(Array.from({ length: 16 }, (_, i) => i));
const empty = new Set<number>();

describe("bingo-detector / BINGO_LINES", () => {
  it("describes exactly 4 rows + 4 cols + 2 diagonals", () => {
    expect(BINGO_LINES.length).toBe(10);
    expect(BINGO_LINES.filter((l) => l.key.startsWith("ROW_")).length).toBe(4);
    expect(BINGO_LINES.filter((l) => l.key.startsWith("COL_")).length).toBe(4);
    expect(
      BINGO_LINES.filter((l) => l.key.startsWith("DIAG_")).length
    ).toBe(2);
  });

  it("each line contains 4 distinct positions in 0..15", () => {
    for (const line of BINGO_LINES) {
      expect(line.positions.length).toBe(4);
      const set = new Set(line.positions);
      expect(set.size).toBe(4);
      for (const p of line.positions) {
        expect(p).toBeGreaterThanOrEqual(0);
        expect(p).toBeLessThan(16);
      }
    }
  });

  it("diagonals are TLBR=[0,5,10,15] and TRBL=[3,6,9,12]", () => {
    const tlbr = BINGO_LINES.find((l) => l.key === "DIAG_TLBR")!;
    const trbl = BINGO_LINES.find((l) => l.key === "DIAG_TRBL")!;
    expect(tlbr.positions).toEqual([0, 5, 10, 15]);
    expect(trbl.positions).toEqual([3, 6, 9, 12]);
  });
});

describe("bingo-detector / computeAchievementTargets", () => {
  it("returns nothing on an empty grid", () => {
    expect(computeAchievementTargets(empty)).toEqual([]);
  });

  it("flags a single completed row as SINGLE_LINE", () => {
    const validated = new Set([0, 1, 2, 3]);
    const targets = computeAchievementTargets(validated);
    expect(targets).toEqual([
      { type: BingoAchievementType.SINGLE_LINE, line: "ROW_0" },
    ]);
  });

  it("flags a single completed column as SINGLE_LINE", () => {
    const validated = new Set([2, 6, 10, 14]);
    const targets = computeAchievementTargets(validated);
    expect(targets).toEqual([
      { type: BingoAchievementType.SINGLE_LINE, line: "COL_2" },
    ]);
  });

  it("flags both diagonals when complete", () => {
    const validated = new Set([0, 3, 5, 6, 9, 10, 12, 15]);
    const targets = computeAchievementTargets(validated);
    const keys = targets.map((t) => t.line).sort();
    expect(keys).toEqual(["DIAG_TLBR", "DIAG_TRBL"]);
    for (const t of targets) {
      expect(t.type).toBe(BingoAchievementType.DOUBLE_LINE);
    }
  });

  it("escalates SINGLE_LINE → DOUBLE_LINE once 2+ lines complete", () => {
    // ROW_0 + ROW_1 fully validated.
    const validated = new Set([0, 1, 2, 3, 4, 5, 6, 7]);
    const targets = computeAchievementTargets(validated);
    expect(targets.length).toBe(2);
    for (const t of targets) {
      expect(t.type).toBe(BingoAchievementType.DOUBLE_LINE);
    }
  });

  it("emits FULL_HOUSE plus every line entry on a full grid", () => {
    const targets = computeAchievementTargets(allPositions);
    const full = targets.filter(
      (t) => t.type === BingoAchievementType.FULL_HOUSE
    );
    expect(full).toEqual([
      { type: BingoAchievementType.FULL_HOUSE, line: "FULL" },
    ]);
    // 10 lines also recorded, all promoted to DOUBLE_LINE.
    const lineEntries = targets.filter(
      (t) => t.type !== BingoAchievementType.FULL_HOUSE
    );
    expect(lineEntries.length).toBe(10);
    for (const l of lineEntries) {
      expect(l.type).toBe(BingoAchievementType.DOUBLE_LINE);
    }
  });

  it("is idempotent: rerunning yields the same set", () => {
    const validated = new Set([0, 1, 2, 3, 4, 8, 12]); // ROW_0 + COL_0
    const a = computeAchievementTargets(validated);
    const b = computeAchievementTargets(validated);
    expect(a).toEqual(b);
  });
});

describe("bingo-detector / detectAchievements (diff)", () => {
  it("only returns achievements not already in existing", () => {
    const validated = new Set([0, 1, 2, 3]);
    const existing = [
      { type: BingoAchievementType.SINGLE_LINE, line: "ROW_0" },
    ];
    expect(detectAchievements(validated, existing)).toEqual([]);
  });

  it("returns newly satisfied achievements only", () => {
    const validated = new Set([0, 1, 2, 3, 4, 5, 6, 7]); // ROW_0 + ROW_1
    const existing = [
      { type: BingoAchievementType.DOUBLE_LINE, line: "ROW_0" },
    ];
    expect(detectAchievements(validated, existing)).toEqual([
      { type: BingoAchievementType.DOUBLE_LINE, line: "ROW_1" },
    ]);
  });
});

describe("bingo-detector / obsoleteAchievements", () => {
  it("flags rows that no longer match after unvalidate", () => {
    const validated = new Set([0, 1, 2]); // ROW_0 broken (missing 3)
    const existing = [
      { type: BingoAchievementType.SINGLE_LINE, line: "ROW_0" },
    ];
    expect(obsoleteAchievements(validated, existing)).toEqual([
      { type: BingoAchievementType.SINGLE_LINE, line: "ROW_0" },
    ]);
  });

  it("when downgrading 2→1 line, the surviving line must change type", () => {
    // Was: ROW_0 + ROW_1 both complete → both stored as DOUBLE_LINE.
    // Now: ROW_1 broken (missing 7). ROW_0 still complete → should be
    // SINGLE_LINE, so the old DOUBLE_LINE/ROW_0 is obsolete.
    const validated = new Set([0, 1, 2, 3, 4, 5, 6]);
    const existing = [
      { type: BingoAchievementType.DOUBLE_LINE, line: "ROW_0" },
      { type: BingoAchievementType.DOUBLE_LINE, line: "ROW_1" },
    ];
    const obsolete = obsoleteAchievements(validated, existing);
    expect(obsolete).toEqual(
      expect.arrayContaining([
        { type: BingoAchievementType.DOUBLE_LINE, line: "ROW_0" },
        { type: BingoAchievementType.DOUBLE_LINE, line: "ROW_1" },
      ])
    );
    expect(obsolete.length).toBe(2);

    const toAdd = detectAchievements(validated, existing);
    expect(toAdd).toEqual([
      { type: BingoAchievementType.SINGLE_LINE, line: "ROW_0" },
    ]);
  });
});
