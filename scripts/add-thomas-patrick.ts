/**
 * Ajoute Thomas (Des Glaçons CMA CGM) et Patrick (RedBull Vodka Hangover).
 * Idempotent : skip si déjà présents.
 *
 * Usage : DATABASE_URL=... npx tsx scripts/add-thomas-patrick.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const RIDERS: {
  firstName: string;
  slug: string;
  teamSlug: string;
  weightKg: number;
  ftpWatts: number;
}[] = [
  { firstName: "Thomas", slug: "thomas", teamSlug: "des-glacons-cma-cgm", weightKg: 69, ftpWatts: 290 },
  { firstName: "Patrick", slug: "patrick", teamSlug: "redbull-vodka-hangover", weightKg: 60, ftpWatts: 260 },
];

async function main() {
  for (const r of RIDERS) {
    const exists = await prisma.rider.findFirst({
      where: { firstName: { equals: r.firstName, mode: "insensitive" } },
    });
    if (exists) {
      console.log(`· ${r.firstName} existe déjà → skip`);
      continue;
    }

    const team = await prisma.team.findUnique({ where: { slug: r.teamSlug } });
    if (!team) {
      console.error(`✗ Équipe introuvable : ${r.teamSlug}`);
      continue;
    }

    const created = await prisma.rider.create({
      data: {
        firstName: r.firstName,
        slug: r.slug,
        teamId: team.id,
        editionCount: 1,
        weightKg: r.weightKg,
        ftpWatts: r.ftpWatts,
      },
    });
    console.log(`✓ Créé : ${created.firstName} → ${team.name} (${r.weightKg}kg, ${r.ftpWatts}W)`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
