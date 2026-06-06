import { BingoAchievementType } from "@prisma/client";
import { GRID_CELL_COUNT, GRID_SIZE } from "./constants";

export type DetectedLine = {
  type: BingoAchievementType;
  line: string;
};

type LineKey = `ROW_${number}` | `COL_${number}` | "DIAG_TLBR" | "DIAG_TRBL";

type LineDef = {
  key: LineKey;
  positions: number[];
};

// 4 rows + 4 cols + 2 diagonals = 10 lines. Computed once at module load.
const LINES: readonly LineDef[] = (() => {
  const lines: LineDef[] = [];
  for (let r = 0; r < GRID_SIZE; r++) {
    const positions: number[] = [];
    for (let c = 0; c < GRID_SIZE; c++) positions.push(r * GRID_SIZE + c);
    lines.push({ key: `ROW_${r}` as LineKey, positions });
  }
  for (let c = 0; c < GRID_SIZE; c++) {
    const positions: number[] = [];
    for (let r = 0; r < GRID_SIZE; r++) positions.push(r * GRID_SIZE + c);
    lines.push({ key: `COL_${c}` as LineKey, positions });
  }
  const tlbr: number[] = [];
  const trbl: number[] = [];
  for (let i = 0; i < GRID_SIZE; i++) {
    tlbr.push(i * GRID_SIZE + i);
    trbl.push(i * GRID_SIZE + (GRID_SIZE - 1 - i));
  }
  lines.push({ key: "DIAG_TLBR", positions: tlbr });
  lines.push({ key: "DIAG_TRBL", positions: trbl });
  return lines;
})();

export const BINGO_LINES = LINES;

// Pure: given the validated cells, return every achievement that SHOULD exist
// for this state. Idempotent because identical input yields identical output.
export function computeAchievementTargets(
  validatedPositions: ReadonlySet<number>
): DetectedLine[] {
  const completedLines = LINES.filter((l) =>
    l.positions.every((p) => validatedPositions.has(p))
  );

  const targets: DetectedLine[] = [];
  const lineType =
    completedLines.length >= 2
      ? BingoAchievementType.DOUBLE_LINE
      : BingoAchievementType.SINGLE_LINE;

  for (const line of completedLines) {
    targets.push({ type: lineType, line: line.key });
  }

  if (validatedPositions.size >= GRID_CELL_COUNT) {
    targets.push({ type: BingoAchievementType.FULL_HOUSE, line: "FULL" });
  }

  return targets;
}

// Spec contract: detector + existing → achievements to ADD (those that should
// exist and aren't already in the DB).
export function detectAchievements(
  validatedPositions: ReadonlySet<number>,
  existingAchievements: readonly { type: BingoAchievementType; line: string }[]
): DetectedLine[] {
  const targets = computeAchievementTargets(validatedPositions);
  const existing = new Set(
    existingAchievements.map((a) => `${a.type}::${a.line}`)
  );
  return targets.filter((t) => !existing.has(`${t.type}::${t.line}`));
}

// Achievements that exist in the DB but no longer match the current state.
// Used by unvalidate to clean up orphans.
export function obsoleteAchievements(
  validatedPositions: ReadonlySet<number>,
  existingAchievements: readonly { type: BingoAchievementType; line: string }[]
): { type: BingoAchievementType; line: string }[] {
  const targets = computeAchievementTargets(validatedPositions);
  const targetKeys = new Set(targets.map((t) => `${t.type}::${t.line}`));
  return existingAchievements.filter(
    (a) => !targetKeys.has(`${a.type}::${a.line}`)
  );
}

// Helper used by the UI overlay: which line key for a given position should
// be highlighted, if any? Returns null when the position isn't on a completed
// line.
export function completedLinesContaining(
  position: number,
  validatedPositions: ReadonlySet<number>
): string[] {
  return LINES.filter(
    (l) =>
      l.positions.includes(position) &&
      l.positions.every((p) => validatedPositions.has(p))
  ).map((l) => l.key);
}
