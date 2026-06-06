import { BingoCategory, type PrismaClient } from "@prisma/client";

export const BINGO_EVENT_SLUG = "tdf-2026";

// TODO: remplacer ce pool par le vrai pool de ~60 entrées
// (commit suivant). Pour l'instant, ~8 cases par catégorie permettent
// de générer des grilles complètes en respectant la distribution 9/5/2.
const PLACEHOLDER_TEMPLATES: ReadonlyArray<{
  text: string;
  category: BingoCategory;
  weight: number;
}> = [
  // GENERIC (besoin >= 9)
  { text: "Crevaison spectaculaire", category: BingoCategory.GENERIC, weight: 10 },
  { text: "Chaîne déraillée en pleine bosse", category: BingoCategory.GENERIC, weight: 10 },
  { text: "Bidon oublié à un ravito", category: BingoCategory.GENERIC, weight: 10 },
  { text: "Chute sans gravité dans un rond-point", category: BingoCategory.GENERIC, weight: 10 },
  { text: "Photo de groupe au sommet d'un col", category: BingoCategory.GENERIC, weight: 10 },
  { text: "Pause café improvisée en plein milieu d'étape", category: BingoCategory.GENERIC, weight: 10 },
  { text: "Vache qui traverse la route", category: BingoCategory.GENERIC, weight: 10 },
  { text: "Pluie battante pendant >20 min", category: BingoCategory.GENERIC, weight: 10 },
  { text: "Sprint final entre 2 équipiers", category: BingoCategory.GENERIC, weight: 10 },
  { text: "Pneu arrière qui fait des siennes", category: BingoCategory.GENERIC, weight: 10 },
  { text: "Quelqu'un perd ses lunettes dans la descente", category: BingoCategory.GENERIC, weight: 10 },
  { text: "Pause photo devant un panneau de col", category: BingoCategory.GENERIC, weight: 10 },

  // GROUP_SPECIFIC (besoin >= 5, avec {name})
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
  {
    text: "{name} se plaint de la chaleur",
    category: BingoCategory.GROUP_SPECIFIC,
    weight: 10,
  },
  {
    text: "{name} sort un nouveau gadget vélo",
    category: BingoCategory.GROUP_SPECIFIC,
    weight: 10,
  },
  {
    text: "{name} parle de son sommeil de la veille",
    category: BingoCategory.GROUP_SPECIFIC,
    weight: 10,
  },
  {
    text: "{name} relance la conversation Whatsapp",
    category: BingoCategory.GROUP_SPECIFIC,
    weight: 10,
  },
  {
    text: "{name} demande à arrêter pour pisser",
    category: BingoCategory.GROUP_SPECIFIC,
    weight: 10,
  },

  // SELF_REFERENTIAL (besoin >= 2)
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
  {
    text: "Quelqu'un trolle la team Glaçons",
    category: BingoCategory.SELF_REFERENTIAL,
    weight: 10,
  },
  {
    text: "Photo de podium reconstituée à 3000m de D+",
    category: BingoCategory.SELF_REFERENTIAL,
    weight: 10,
  },
  {
    text: "Référence au Tour officiel pendant une vraie étape",
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
