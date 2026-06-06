"use server";

import { revalidatePath } from "next/cache";
import { BingoAchievementType } from "@prisma/client";
import { prisma } from "@/lib/db";
import {
  detectAchievements,
  type DetectedLine,
} from "@/features/bingo/lib/bingo-detector";
import {
  GRID_CELL_COUNT,
  MAX_NOTE_LENGTH,
} from "@/features/bingo/lib/constants";
import { broadcastBingoValidated } from "@/features/bingo/sse/bingo-events";
import {
  BingoForbiddenError,
  assertBingoEnabled,
  requireBingoUser,
} from "@/features/bingo/actions/_shared";

export type ValidateCellResult =
  | {
      ok: true;
      cellId: string;
      position: number;
      newlyUnlocked: DetectedLine[];
      firstBingo: boolean;
      fullHouse: boolean;
    }
  | { ok: false; error: string };

export async function validateCellAction(params: {
  cellId: string;
  note?: string;
}): Promise<ValidateCellResult> {
  assertBingoEnabled();
  const { userId, userName } = await requireBingoUser();

  const note = params.note?.trim().slice(0, MAX_NOTE_LENGTH) ?? null;

  const cell = await prisma.bingoGridCell.findUnique({
    where: { id: params.cellId },
    include: { grid: { include: { event: true } } },
  });
  if (!cell) return { ok: false, error: "Case introuvable." };
  if (cell.grid.userId !== userId) throw new BingoForbiddenError();

  // Idempotent no-op when already validated. We still optionally refresh the
  // note so the user can edit it without untoggling.
  if (cell.validatedAt) {
    if (note !== null && note !== cell.validationNote) {
      await prisma.bingoGridCell.update({
        where: { id: cell.id },
        data: { validationNote: note },
      });
      revalidatePath("/bingo");
    }
    return {
      ok: true,
      cellId: cell.id,
      position: cell.position,
      newlyUnlocked: [],
      firstBingo: false,
      fullHouse: cell.grid.fullHouseAt !== null,
    };
  }

  const { newAchievements, firstBingo, fullHouse, validatedAt } =
    await prisma.$transaction(async (tx) => {
      const validatedAt = new Date();

      await tx.bingoGridCell.update({
        where: { id: cell.id },
        data: { validatedAt, validationNote: note },
      });

      const allValidated = await tx.bingoGridCell.findMany({
        where: { gridId: cell.gridId, validatedAt: { not: null } },
        select: { position: true },
      });
      const validatedPositions = new Set(allValidated.map((c) => c.position));

      const existing = await tx.bingoAchievement.findMany({
        where: { gridId: cell.gridId },
        select: { type: true, line: true },
      });
      const newAchievements = detectAchievements(validatedPositions, existing);

      if (newAchievements.length > 0) {
        await tx.bingoAchievement.createMany({
          data: newAchievements.map((a) => ({
            gridId: cell.gridId,
            userId: cell.grid.userId,
            type: a.type,
            line: a.line,
          })),
          skipDuplicates: true,
        });
      }

      const grid = cell.grid;
      const updates: { firstBingoAt?: Date; fullHouseAt?: Date } = {};
      const hasAnyLine =
        existing.some(
          (a) =>
            a.type === BingoAchievementType.SINGLE_LINE ||
            a.type === BingoAchievementType.DOUBLE_LINE
        ) ||
        newAchievements.some(
          (a) =>
            a.type === BingoAchievementType.SINGLE_LINE ||
            a.type === BingoAchievementType.DOUBLE_LINE
        );
      const firstBingo = grid.firstBingoAt === null && hasAnyLine;
      if (firstBingo) updates.firstBingoAt = validatedAt;

      const fullHouse =
        grid.fullHouseAt === null && validatedPositions.size >= GRID_CELL_COUNT;
      if (fullHouse) updates.fullHouseAt = validatedAt;

      if (Object.keys(updates).length > 0) {
        await tx.bingoGrid.update({
          where: { id: cell.gridId },
          data: updates,
        });
      }

      return { newAchievements, firstBingo, fullHouse, validatedAt };
    });

  broadcastBingoValidated(cell.grid.eventId, {
    userId,
    userName,
    cellId: cell.id,
    position: cell.position,
    cellText: cell.text,
    achievements: newAchievements,
    validatedAt: validatedAt.toISOString(),
  });

  revalidatePath("/bingo");
  revalidatePath("/bingo/feed");

  return {
    ok: true,
    cellId: cell.id,
    position: cell.position,
    newlyUnlocked: newAchievements,
    firstBingo,
    fullHouse,
  };
}
