"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { generateGrid } from "@/features/bingo/lib/generator";
import { getActiveBingoEvent } from "@/features/bingo/lib/event";
import {
  assertBingoEnabled,
  requireBingoUser,
} from "@/features/bingo/actions/_shared";

export type GenerateGridResult =
  | { ok: true; gridId: string }
  | { ok: false; error: string };

export async function generateGridAction(): Promise<GenerateGridResult> {
  assertBingoEnabled();
  const { userId } = await requireBingoUser();

  const event = await getActiveBingoEvent();
  if (!event) return { ok: false, error: "Aucun événement bingo actif." };

  try {
    const grid = await generateGrid({ eventId: event.id, userId, prisma });
    revalidatePath("/bingo");
    return { ok: true, gridId: grid.id };
  } catch (err) {
    console.error("[bingo] generateGridAction failed", err);
    return { ok: false, error: "Impossible de générer la grille." };
  }
}
