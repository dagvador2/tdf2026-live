"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getSessionRider } from "@/lib/auth/getSessionRider";
import { FUN_FACT_KEYS } from "@/lib/constants/fun-facts";

export interface ProfileFormValues {
  firstName: string;
  nickname: string;
  photoUrl: string;
  weightKg: string;
  ftpWatts: string;
  level: string;
  funFacts: Record<string, string>;
}

export async function updateProfile(values: ProfileFormValues) {
  const result = await getSessionRider();
  if (result.status !== "rider") {
    return { ok: false, error: "Tu dois être lié à un profil coureur." };
  }

  const firstName = values.firstName.trim();
  if (!firstName) {
    return { ok: false, error: "Le prénom est requis." };
  }

  const weightKg =
    values.weightKg.trim() === "" ? null : parseFloat(values.weightKg);
  const ftpWatts =
    values.ftpWatts.trim() === "" ? null : parseInt(values.ftpWatts, 10);

  if (weightKg != null && (Number.isNaN(weightKg) || weightKg < 30 || weightKg > 200)) {
    return { ok: false, error: "Poids invalide (entre 30 et 200 kg)." };
  }
  if (ftpWatts != null && (Number.isNaN(ftpWatts) || ftpWatts < 50 || ftpWatts > 600)) {
    return { ok: false, error: "FTP invalide (entre 50 et 600 W)." };
  }

  const allowedLevels = ["beginner", "intermediate", "advanced", "competitor", ""];
  if (!allowedLevels.includes(values.level)) {
    return { ok: false, error: "Niveau invalide." };
  }

  // Ne garder que les clés fun facts connues, trim + supprime les vides
  const cleanFunFacts: Record<string, string> = {};
  for (const key of FUN_FACT_KEYS) {
    const v = values.funFacts[key]?.trim();
    if (v) cleanFunFacts[key] = v;
  }

  await prisma.rider.update({
    where: { id: result.rider.id },
    data: {
      firstName,
      nickname: values.nickname.trim() || null,
      photoUrl: values.photoUrl.trim() || null,
      weightKg,
      ftpWatts,
      level: values.level || null,
      funFacts: cleanFunFacts,
    },
  });

  revalidatePath("/mon-espace");
  revalidatePath("/mon-espace/profil");
  revalidatePath(`/coureurs/${result.rider.slug}`);

  return { ok: true };
}
