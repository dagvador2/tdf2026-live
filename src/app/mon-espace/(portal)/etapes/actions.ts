"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getSessionRider } from "@/lib/auth/getSessionRider";

export async function toggleStageEntry(stageId: string, participate: boolean) {
  const result = await getSessionRider();
  if (result.status !== "rider") {
    return { ok: false, error: "Tu dois être lié à un profil coureur." };
  }

  const stage = await prisma.stage.findUnique({ where: { id: stageId } });
  if (!stage) {
    return { ok: false, error: "Étape introuvable." };
  }
  if (stage.status !== "upcoming") {
    return {
      ok: false,
      error: "L'étape a déjà commencé — contacte l'admin pour modifier.",
    };
  }

  const existing = await prisma.stageEntry.findUnique({
    where: { riderId_stageId: { riderId: result.rider.id, stageId } },
  });

  if (participate && !existing) {
    await prisma.stageEntry.create({
      data: { riderId: result.rider.id, stageId, status: "registered" },
    });
  } else if (!participate && existing) {
    // Safety : refuser si des données sont déjà liées à l'entry
    const [gpsCount, timeCount] = await Promise.all([
      prisma.gpsPosition.count({ where: { entryId: existing.id } }),
      prisma.timeRecord.count({ where: { entryId: existing.id } }),
    ]);
    if (gpsCount > 0 || timeCount > 0) {
      return {
        ok: false,
        error: "Données GPS/temps déjà enregistrées — contacte l'admin.",
      };
    }
    await prisma.stageEntry.delete({ where: { id: existing.id } });
  }

  revalidatePath("/mon-espace");
  revalidatePath("/mon-espace/etapes");
  return { ok: true };
}
