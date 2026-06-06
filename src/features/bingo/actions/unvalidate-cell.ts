"use server";

import { revalidatePath } from "next/cache";
import { BingoAchievementType } from "@prisma/client";
import { prisma } from "@/lib/db";
import {
  computeAchievementTargets,
  obsoleteAchievements,
} from "@/features/bingo/lib/bingo-detector";
import { GRID_CELL_COUNT } from "@/features/bingo/lib/constants";
import { broadcastBingoUnvalidated } from "@/features/bingo/sse/bingo-events";
import {
  BingoForbiddenError,
  assertBingoEnabled,
  requireBingoUser,
} from "@/features/bingo/actions/_shared";

export type UnvalidateCellResult =
  | { ok: true; cellId: string; position: number }
  | { ok: false; error: string };

export async function unvalidateCellAction(params: {
  cellId: string;
}): Promise<UnvalidateCellResult> {
  assertBingoEnabled();
  const { userId } = await requireBingoUser();

  const cell = await prisma.bingoGridCell.findUnique({
    where: { id: params.cellId },
    include: { grid: true },
  });
  if (!cell) return { ok: false, error: "Case introuvable." };
  if (cell.grid.userId !== userId) throw new BingoForbiddenError();

  // No-op if already unvalidated.
  if (!cell.validatedAt) {
    return { ok: true, cellId: cell.id, position: cell.position };
  }

  await prisma.$transaction(async (tx) => {
    await tx.bingoGridCell.update({
      where: { id: cell.id },
      data: { validatedAt: null, validationNote: null },
    });

    const allValidated = await tx.bingoGridCell.findMany({
      where: { gridId: cell.gridId, validatedAt: { not: null } },
      select: { position: true },
    });
    const validatedPositions = new Set(allValidated.map((c) => c.position));

    const existing = await tx.bingoAchievement.findMany({
      where: { gridId: cell.gridId },
      select: { id: true, type: true, line: true },
    });
    const obsolete = obsoleteAchievements(validatedPositions, existing);
    if (obsolete.length > 0) {
      // Match by (gridId, type, line) — the unique constraint makes this exact.
      await tx.bingoAchievement.deleteMany({
        where: {
          gridId: cell.gridId,
          OR: obsolete.map((o) => ({ type: o.type, line: o.line })),
        },
      });
    }

    // Recompute remaining targets to decide whether to clear timestamps.
    const remaining = computeAchievementTargets(validatedPositions);
    const stillHasAnyLine = remaining.some(
      (a) =>
        a.type === BingoAchievementType.SINGLE_LINE ||
        a.type === BingoAchievementType.DOUBLE_LINE
    );
    const stillFullHouse = validatedPositions.size >= GRID_CELL_COUNT;

    const updates: { firstBingoAt?: null; fullHouseAt?: null } = {};
    if (!stillHasAnyLine && cell.grid.firstBingoAt !== null)
      updates.firstBingoAt = null;
    if (!stillFullHouse && cell.grid.fullHouseAt !== null)
      updates.fullHouseAt = null;

    if (Object.keys(updates).length > 0) {
      await tx.bingoGrid.update({
        where: { id: cell.gridId },
        data: updates,
      });
    }
  });

  broadcastBingoUnvalidated(cell.grid.eventId, {
    userId,
    cellId: cell.id,
    position: cell.position,
  });

  revalidatePath("/bingo");
  revalidatePath("/bingo/feed");

  return { ok: true, cellId: cell.id, position: cell.position };
}
