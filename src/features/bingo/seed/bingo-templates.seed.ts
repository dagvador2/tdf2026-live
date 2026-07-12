import { BingoCategory, type PrismaClient } from "@prisma/client";

export const BINGO_EVENT_SLUG = "tdf-2026";

// ── targetUserId de référence (User.id) ──
const ID = {
  maxime: "cmoe9oy8x0006b54xivkxg32v",
  ronan: "cmog0anxl000ekbuetl696qml",
  lucie: "cmofz9f8h0009kbuejnfigojs",
  selim: "cmom1eee2001qd3qb0w4hauom",
  clement: "cmo9zx1eh0000mcsv6ziirwws",
  antonin: "cmoqatnw5003id3qbbeilge45",
  gaelle: "cmog7pwu5000kkbuefhbp59ls",
  eve: "cmoe9sjee000cb54xs1cjbqku",
  ambre: "cmoe91m2y0000b54xh8bezj0w",
  gabriel: "cmohkvslh000ykbuezncdwrv2",
  louise: "cmog47vxj000hkbuezzo4mhln",
  coco: "cmoyly5nl000010k9enjf93dj",
  thomasB: "cmq70pheo000to2il15hm2bdr",
  quentin: "cmoro1i390045d3qbeab0w67s",
  nicolas: "cmoe9pxnh0009b54xz11g12i3",
  jules: "cmogvh06v000vkbuexwpcygw9",
  pierre: "cmot36orf0050d3qbs7scjzi3",
  thierry: "cmoe7d7g50000zj88ra15u6sl",
} as const;

type PoolEntry = {
  text: string;
  category: BingoCategory;
  weight: number;
  targetUserId?: string; // id direct (GROUP_SPECIFIC)
  targetName?: string; // à résoudre par prénom en base (GROUP_SPECIFIC sans id)
};

const G = BingoCategory.GENERIC;
const GS = BingoCategory.GROUP_SPECIFIC;

// ── Pool réel (66 cases) ──
const POOL: PoolEntry[] = [
  // 1) ÉVÉNEMENTS PURS — GENERIC
  { text: "Une chaîne déraille", category: G, weight: 30 },
  { text: "Une crevaison", category: G, weight: 30 },
  { text: "Une voiture UAE nous fait un signe", category: G, weight: 10 },
  { text: "Une voiture Visma nous fait un signe", category: G, weight: 10 },
  { text: "Une voiture Red Bull nous fait un signe", category: G, weight: 10 },
  { text: "Une voiture Decathlon nous fait un signe", category: G, weight: 10 },
  { text: "Demi-tour d'une voiture/master pour un oubli", category: G, weight: 10 },
  { text: "Quelqu'un pose le pied / cale dans une montée", category: G, weight: 10 },

  // 2) ACTION « QUELQU'UN » — GENERIC
  { text: "Quelqu'un sort le pastis/Ricard à l'apéro", category: G, weight: 30 },
  { text: "Quelqu'un utilise le poids de son vélo comme excuse", category: G, weight: 10 },
  { text: "Quelqu'un taxe une bière à des spectateurs à l'Alpe d'Huez", category: G, weight: 10 },
  { text: "Quelqu'un fait des œufs en plus du repas classique", category: G, weight: 10 },
  { text: "Quelqu'un annonce qu'il \"était pas à fond\" après s'être fait déposer", category: G, weight: 10 },
  { text: "Quelqu'un négocie un truc gratuit avec un commerçant local", category: G, weight: 10 },
  { text: "Quelqu'un se fait prendre en photo avec des inconnus comme s'il était pro", category: G, weight: 3 },
  { text: "Quelqu'un compare le voyage à \"une vraie étape du Tour\"", category: G, weight: 10 },
  { text: "Quelqu'un refait son réglage de selle au milieu d'une étape", category: G, weight: 3 },
  { text: "Quelqu'un jure que \"demain il attaque\"", category: G, weight: 10 },
  { text: "Quelqu'un justifie sa contre-perf par \"je suis un coureur, pas un cycliste\"", category: G, weight: 10 },
  { text: "Quelqu'un prend un Imodium/Smecta avant ou pendant l'étape", category: G, weight: 10 },
  { text: "Quelqu'un réclame une bière en haut d'un col", category: G, weight: 10 },
  { text: "Quelqu'un justifie sa mauvaise perf par son vélo pas au niveau", category: G, weight: 3 },
  { text: "Quelqu'un tape une fringale", category: G, weight: 10 },

  // 3) NOMINATIVES — GROUP_SPECIFIC
  { text: "Selim gueule sur une voiture dans un col", category: GS, weight: 10, targetUserId: ID.selim },
  { text: "Selim parle d'un de ses crushs", category: GS, weight: 10, targetUserId: ID.selim },
  { text: "Selim lâche un \"chaaaat\"", category: GS, weight: 30, targetUserId: ID.selim },
  { text: "Selim fait des bruits de sanglier dans l'effort", category: GS, weight: 10, targetUserId: ID.selim },
  { text: "Selim dit que \"le CLM c'est pour lui\"", category: GS, weight: 10, targetUserId: ID.selim },
  { text: "Selim s'achète un coca à un moment complètement random", category: GS, weight: 3, targetUserId: ID.selim },
  { text: "Romain engraine quelqu'un à boire du ricassou", category: GS, weight: 10, targetName: "Romain" },
  { text: "Romain utilise le mot \"monchu\"", category: GS, weight: 10, targetName: "Romain" },
  { text: "Ronan propose d'aller courir après une étape", category: GS, weight: 10, targetUserId: ID.ronan },
  { text: "Ronan mange au moins 2 œufs en plus d'un repas classique", category: GS, weight: 30, targetUserId: ID.ronan },
  { text: "Ronan lâche un \"aujourd'hui c'est chantier\"", category: GS, weight: 10, targetUserId: ID.ronan },
  { text: "Ronan va courir en plus d'une étape", category: GS, weight: 10, targetUserId: ID.ronan },
  { text: "Thierry sauce son vélo vintage", category: GS, weight: 10, targetUserId: ID.thierry },
  { text: "Nico parle de Wout van Aert", category: GS, weight: 10, targetUserId: ID.nicolas },
  { text: "Nicolas roule sans les mains", category: GS, weight: 3, targetUserId: ID.nicolas },
  { text: "Florian parle de son dérailleur dans la Cime de la Bonette", category: GS, weight: 3, targetName: "Florian" },
  { text: "Sury sort son pull de daron cycliste", category: GS, weight: 3, targetName: "Mathieu Surirey" },
  { text: "Maxime lâche un \"les kiffeuuuurs\"", category: GS, weight: 30, targetUserId: ID.maxime },
  { text: "Maxime frime avec ses \"nouveaux pneus Michelin\"", category: GS, weight: 3, targetUserId: ID.maxime },
  { text: "Maxou s'étale de la crème solaire pendant une plombe", category: GS, weight: 3, targetUserId: ID.maxime },
  { text: "Lucie appelle \"Maxouuuu\"", category: GS, weight: 30, targetUserId: ID.lucie },
  { text: "Lucie va courir en plus le jour d'une étape", category: GS, weight: 10, targetUserId: ID.lucie },
  { text: "Lucie sort sa \"FTP de crevette\"", category: GS, weight: 10, targetUserId: ID.lucie },
  { text: "Lucie n'arrive pas à boire en roulant", category: GS, weight: 3, targetUserId: ID.lucie },
  { text: "Clément se met en danseuse pour un rien", category: GS, weight: 10, targetUserId: ID.clement },
  { text: "Clément mange la bouche ouverte", category: GS, weight: 10, targetUserId: ID.clement },
  { text: "Antonin est en retard", category: GS, weight: 30, targetUserId: ID.antonin },
  { text: "Gaëlle propose de cuisiner un truc", category: GS, weight: 10, targetUserId: ID.gaelle },
  { text: "Ève fait ses exos d'échauffement", category: GS, weight: 10, targetUserId: ID.eve },
  { text: "Ambre menace d'un \"pied-bouche\"", category: GS, weight: 10, targetUserId: ID.ambre },
  { text: "Ambre s'énerve/râle (ça passe après)", category: GS, weight: 10, targetUserId: ID.ambre },
  { text: "Gab place un mot d'anglais sur deux", category: GS, weight: 10, targetUserId: ID.gabriel },
  { text: "Gab dit \"ça me fout en l'air\"", category: GS, weight: 10, targetUserId: ID.gabriel },
  { text: "Gabriel boit un pastis avant une étape", category: GS, weight: 10, targetUserId: ID.gabriel },
  { text: "Gabriel blâme son vélo pour sa perf", category: GS, weight: 10, targetUserId: ID.gabriel },
  { text: "Louise pique une sieste n'importe où", category: GS, weight: 10, targetUserId: ID.louise },
  { text: "Thomas raconte ses marathons", category: GS, weight: 3, targetUserId: ID.thomasB },
  { text: "Quentin mate les cuisses de tout le monde ou dit le mot \"cuissot\"", category: GS, weight: 3, targetUserId: ID.quentin },
  { text: "Jules bat Maxou dans un col", category: GS, weight: 3, targetUserId: ID.jules },
  { text: "Robin demande le poids de son vélo à quelqu'un", category: GS, weight: 10, targetName: "Robin Vouillot" },
  { text: "Kevin parle d'une de ses courses de vélo", category: GS, weight: 10, targetName: "Kévin Lorenzo" },
  { text: "Mathieu parle de Summit", category: GS, weight: 10, targetName: "Mathieu Surirey" },
  { text: "Mathieu utilise le terme \"Minot\"", category: GS, weight: 10, targetName: "Mathieu Surirey" },
];

/** Résout un prénom (ou prénom + nom) vers un User.id via le rider lié. */
function makeResolver(riders: { userId: string; firstName: string }[]) {
  const norm = (s: string) => s.trim().toLowerCase();
  return (name: string): string | null => {
    const key = norm(name);
    const exact = riders.filter((r) => norm(r.firstName) === key);
    if (exact.length === 1) return exact[0].userId;
    if (exact.length > 1) return null; // ambigu
    const partial = riders.filter(
      (r) => norm(r.firstName).includes(key) || key.includes(norm(r.firstName)),
    );
    const ids = new Set(partial.map((r) => r.userId));
    return ids.size === 1 ? partial[0].userId : null;
  };
}

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

  // Table de résolution par prénom (pour les cibles sans id).
  const users = await prisma.user.findMany({
    where: { riderId: { not: null } },
    select: { id: true, rider: { select: { firstName: true } } },
  });
  const resolve = makeResolver(
    users.filter((u) => u.rider).map((u) => ({ userId: u.id, firstName: u.rider!.firstName })),
  );

  const skipped: string[] = [];
  const seededTexts: string[] = [];
  const counts = { GENERIC: 0, GROUP_SPECIFIC: 0 } as Record<string, number>;

  for (const entry of POOL) {
    let targetUserId: string | null = null;
    if (entry.category === GS) {
      if (entry.targetUserId) {
        targetUserId = entry.targetUserId;
      } else if (entry.targetName) {
        targetUserId = resolve(entry.targetName);
        if (!targetUserId) {
          console.warn(
            `[bingo] cible introuvable pour "${entry.targetName}" → case sautée: « ${entry.text} »`,
          );
          skipped.push(`${entry.text} (cible: ${entry.targetName})`);
          continue;
        }
      }
    }

    // Upsert idempotent par (eventId, text). N'efface rien → grilles préservées.
    const existing = await prisma.bingoCellTemplate.findFirst({
      where: { eventId: event.id, text: entry.text },
      select: { id: true },
    });
    const data = {
      category: entry.category,
      weight: entry.weight,
      targetUserId,
      isActive: true,
    };
    if (existing) {
      await prisma.bingoCellTemplate.update({ where: { id: existing.id }, data });
    } else {
      await prisma.bingoCellTemplate.create({
        data: { eventId: event.id, text: entry.text, ...data },
      });
    }
    seededTexts.push(entry.text);
    counts[entry.category] = (counts[entry.category] ?? 0) + 1;
  }

  // Désactive les anciens placeholders (hors pool) sans les supprimer : les
  // grilles déjà générées référencent ces templates (FK) et restent intactes.
  const deactivated = await prisma.bingoCellTemplate.updateMany({
    where: { eventId: event.id, isActive: true, text: { notIn: seededTexts } },
    data: { isActive: false },
  });

  console.log(
    `[bingo] seed OK — event=${event.id}\n` +
      `  GENERIC: ${counts.GENERIC} | GROUP_SPECIFIC: ${counts.GROUP_SPECIFIC} | total actif: ${seededTexts.length}\n` +
      `  anciens templates désactivés (hors pool): ${deactivated.count}\n` +
      `  cases sautées (cible introuvable): ${skipped.length}` +
      (skipped.length ? `\n   - ${skipped.join("\n   - ")}` : ""),
  );

  return { eventId: event.id, seeded: seededTexts.length, skipped };
}

// Exécution standalone : `npx tsx src/features/bingo/seed/bingo-templates.seed.ts`
if (require.main === module) {
  (async () => {
    const { PrismaClient } = await import("@prisma/client");
    const prisma = new PrismaClient();
    try {
      await seedBingo(prisma);
    } finally {
      await prisma.$disconnect();
    }
  })();
}
