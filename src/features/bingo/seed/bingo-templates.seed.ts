import { BingoCategory, type PrismaClient } from "@prisma/client";

export const BINGO_EVENT_SLUG = "tdf-2026";

// TODO: remplacer ce pool par le vrai pool de ~60 entrées
// (commit suivant). Pour l'instant, 3 cases par catégorie suffisent
// à tester la génération.
const PLACEHOLDER_TEMPLATES: ReadonlyArray<{
  text: string;
  category: BingoCategory;
  weight: number;
}> = [
  // GENERIC
  { text: "Crevaison spectaculaire", category: BingoCategory.GENERIC, weight: 10 },
  { text: "Chaîne déraillée", category: BingoCategory.GENERIC, weight: 10 },
  { text: "Bidon oublié à un ravito", category: BingoCategory.GENERIC, weight: 10 },
  // GROUP_SPECIFIC
  {
    text: "{name} parle de son FTP",
    category: BingoCategory.GROUP_SPECIFIC,
    weight: 10,
  },
  {
    text: "{name} mentionne Pogačar",
    category: BingoCategory.GROUP_SPECIFIC,
    weight: 10,
  },
  {
    text: '{name} dit "marginal gains"',
    category: BingoCategory.GROUP_SPECIFIC,
    weight: 10,
  },
  // SELF_REFERENTIAL
  {
    text: "Panne app résolue en <5 min",
    category: BingoCategory.SELF_REFERENTIAL,
    weight: 10,
  },
  {
    text: "DS Visma boit un Ricard avant midi",
    category: BingoCategory.SELF_REFERENTIAL,
    weight: 10,
  },
  {
    text: "Discours d'avant-étape >1 min",
    category: BingoCategory.SELF_REFERENTIAL,
    weight: 10,
  },
];

export async function seedBingo(prisma: PrismaClient) {
  const event = await prisma.bingoEvent.upsert({
    where: { slug: BINGO_EVENT_SLUG },
    create: {
      slug: BINGO_EVENT_SLUG,
      name: "Bingo TDF 2026",
      startsAt: new Date("2026-07-20T00:00:00Z"),
      endsAt: new Date("2026-07-26T23:59:59Z"),
      isActive: true,
    },
    update: {
      name: "Bingo TDF 2026",
      startsAt: new Date("2026-07-20T00:00:00Z"),
      endsAt: new Date("2026-07-26T23:59:59Z"),
    },
  });

  // Idempotent: replace the placeholder pool entirely on each run so we don't
  // accumulate duplicates while iterating on the real catalogue.
  await prisma.bingoCellTemplate.deleteMany({ where: { eventId: event.id } });
  await prisma.bingoCellTemplate.createMany({
    data: PLACEHOLDER_TEMPLATES.map((t) => ({ ...t, eventId: event.id })),
  });

  return {
    eventId: event.id,
    templateCount: PLACEHOLDER_TEMPLATES.length,
  };
}

// Allow running this file standalone: `npx tsx src/features/bingo/seed/bingo-templates.seed.ts`
if (require.main === module) {
  // Lazy import to avoid pulling Prisma when this module is imported as a lib.
  (async () => {
    const { PrismaClient } = await import("@prisma/client");
    const prisma = new PrismaClient();
    try {
      const result = await seedBingo(prisma);
      console.log(
        `[bingo] seed OK — event=${result.eventId}, templates=${result.templateCount}`
      );
    } finally {
      await prisma.$disconnect();
    }
  })();
}
