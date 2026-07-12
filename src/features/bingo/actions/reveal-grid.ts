"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { generateGrid } from "@/features/bingo/lib/generator";
import { getActiveBingoEvent } from "@/features/bingo/lib/event";
import {
  BingoDisabledError,
  BingoForbiddenError,
  assertBingoEnabled,
  requireBingoUser,
} from "@/features/bingo/actions/_shared";

export type RevealGridResult =
  | { ok: true }
  | { ok: false; error: string };

/**
 * Révèle la grille (pré-générée à l'avance et masquée). Si aucune grille
 * n'existe encore, on la génère puis on la révèle — l'effet reste « ça vient
 * de se générer » pour le coureur.
 */
export async function revealGridAction(): Promise<RevealGridResult> {
  try {
    assertBingoEnabled();
    const { userId } = await requireBingoUser();

    const event = await getActiveBingoEvent();
    if (!event) return { ok: false, error: "Aucun événement bingo actif." };

    const grid = await prisma.bingoGrid.findUnique({
      where: { eventId_userId: { eventId: event.id, userId } },
      select: { id: true, revealedAt: true },
    });

    if (!grid) {
      const generated = await generateGrid({ eventId: event.id, userId, prisma });
      await prisma.bingoGrid.update({
        where: { id: generated.id },
        data: { revealedAt: new Date() },
      });
    } else if (!grid.revealedAt) {
      await prisma.bingoGrid.update({
        where: { id: grid.id },
        data: { revealedAt: new Date() },
      });
    }

    revalidatePath("/bingo");
    return { ok: true };
  } catch (err) {
    console.error("[bingo] revealGridAction failed", err);
    if (err instanceof BingoDisabledError)
      return { ok: false, error: "Feature désactivée." };
    if (err instanceof BingoForbiddenError)
      return { ok: false, error: `Non autorisé (${err.message}).` };
    const detail = err instanceof Error ? err.message : String(err);
    return { ok: false, error: `Erreur: ${detail}` };
  }
}
