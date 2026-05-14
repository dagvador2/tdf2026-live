"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getSessionRider } from "@/lib/auth/getSessionRider";

export interface JerseysFormValues {
  jerseySize: string;
  extraJerseys: Record<string, number>;
}

const ALLOWED_JERSEY_SIZES = ["XS", "S", "M", "L", "XL", "XXL", ""] as const;

export async function updateJerseys(values: JerseysFormValues) {
  const result = await getSessionRider();
  if (result.status !== "rider") {
    return { ok: false, error: "Tu dois être lié à un profil coureur." };
  }

  if (!ALLOWED_JERSEY_SIZES.includes(values.jerseySize as (typeof ALLOWED_JERSEY_SIZES)[number])) {
    return { ok: false, error: "Taille de maillot invalide." };
  }

  const validTeams = await prisma.team.findMany({
    where: { slug: { not: "sans-equipe" } },
    select: { slug: true },
  });
  const validSlugs = new Set(validTeams.map((t) => t.slug));
  const cleanExtras: Record<string, number> = {};
  for (const [slug, qty] of Object.entries(values.extraJerseys ?? {})) {
    if (!validSlugs.has(slug)) continue;
    const n = Math.floor(Number(qty));
    if (!Number.isFinite(n) || n < 0 || n > 10) {
      return { ok: false, error: `Quantité invalide pour ${slug} (0 à 10).` };
    }
    if (n > 0) cleanExtras[slug] = n;
  }

  await prisma.rider.update({
    where: { id: result.rider.id },
    data: {
      jerseySize: values.jerseySize || null,
      extraJerseys: cleanExtras,
    },
  });

  revalidatePath("/mon-espace");
  revalidatePath("/mon-espace/maillots");

  return { ok: true };
}
