import type {
  BingoAchievement,
  BingoAchievementType,
  BingoGrid as BingoGridModel,
  BingoGridCell,
} from "@prisma/client";
import { BingoGridClient } from "./BingoGridClient";

type GridProps = {
  grid: BingoGridModel & {
    cells: BingoGridCell[];
    achievements: Pick<BingoAchievement, "type" | "line">[];
  };
};

export function BingoGrid({ grid }: GridProps) {
  // Map cells to a plain DTO so we don't ship Prisma Date/Decimal types to
  // the client unnecessarily.
  const cells = grid.cells.map((c) => ({
    id: c.id,
    position: c.position,
    text: c.text,
    category: c.category,
    validatedAt: c.validatedAt ? c.validatedAt.toISOString() : null,
    validationNote: c.validationNote,
  }));

  return (
    <BingoGridClient
      gridId={grid.id}
      cells={cells}
      firstBingoAt={grid.firstBingoAt ? grid.firstBingoAt.toISOString() : null}
      fullHouseAt={grid.fullHouseAt ? grid.fullHouseAt.toISOString() : null}
      existingAchievements={grid.achievements.map((a) => ({
        type: a.type as BingoAchievementType,
        line: a.line,
      }))}
    />
  );
}
