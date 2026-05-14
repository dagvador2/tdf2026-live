/**
 * Migration idempotente : passage aux 4 nouvelles équipes (EAU Pastis XRG,
 * RedBull Vodka Hangover, Des Glaçons CMA CGM, Visma Ricard) + équipe interne
 * "Sans équipe" pour les coureurs hors composition.
 *
 * Non destructif : conserve les ids des équipes existantes, les coureurs et
 * toutes les autres tables (admins, étapes, checkpoints, photos…).
 *
 * Usage :
 *   DATABASE_URL=... npx tsx scripts/migrate-teams-2026-05.ts --dry-run   (simulation)
 *   DATABASE_URL=... npx tsx scripts/migrate-teams-2026-05.ts             (réel)
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const DRY_RUN = process.argv.includes("--dry-run");
const tag = (s: string) => (DRY_RUN ? `[DRY] ${s}` : s);

type TeamDef = { name: string; slug: string; color: string; logoUrl: string | null; description: string };

const NEW_TEAMS: TeamDef[] = [
  { name: "EAU Pastis XRG", slug: "eau-pastis-xrg", color: "#E30613", logoUrl: "/teams/eau-pastis-xrg.png", description: "Quand l'eau se mélange au pastis, ça donne du style." },
  { name: "RedBull Vodka Hangover", slug: "redbull-vodka-hangover", color: "#1B7373", logoUrl: "/teams/redbull-vodka-hangover.png", description: "Donne des ailes — et la gueule de bois qui va avec." },
  { name: "Des Glaçons CMA CGM", slug: "des-glacons-cma-cgm", color: "#1B2D6B", logoUrl: "/teams/des-glacons-cma-cgm.png", description: "On livre les glaçons à toute la flotte." },
  { name: "Visma Ricard", slug: "visma-ricard", color: "#FFE600", logoUrl: "/teams/visma-ricard.png", description: "L'équipe jaune, la couleur du maillot et du pastis." },
  { name: "Sans équipe", slug: "sans-equipe", color: "#9CA3AF", logoUrl: null, description: "Coureurs en attente d'attribution." },
];

// Mapping old slug -> new slug (pour préserver les ids existants)
const SLUG_MIGRATION: Record<string, string> = {
  "visma-lease-a-ricard": "visma-ricard",
  "eau-team-pastis": "eau-pastis-xrg",
  "groupama-federation-du-jaune": "redbull-vodka-hangover",
  "ineos-anises": "des-glacons-cma-cgm",
};

// Composition réelle (premier prénom matché en DB)
const COMPOSITION: Record<string, string[]> = {
  "eau-pastis-xrg": ["Kévin", "Benjamin", "Pierre", "Jules", "Luc", "Thierry", "Ambre"],
  "redbull-vodka-hangover": ["Nicolas", "Sélim", "Romain", "Nadège", "Stanoche", "Lucie", "Gaëlle"],
  "des-glacons-cma-cgm": ["Clément", "Antonin", "Mathieu", "Quentin", "Maxime", "Louison", "Louise"],
  "visma-ricard": ["Ronan", "Robin", "Gabriel", "Florian", "Antoine", "Coco", "Ève"],
};

// Coureurs à créer s'ils sont absents (firstName complet + slug)
const RIDERS_TO_CREATE: { firstName: string; slug: string; teamSlug: string }[] = [
  { firstName: "Nadège", slug: "nadege", teamSlug: "redbull-vodka-hangover" },
];

function normalize(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

async function main() {
  console.log(DRY_RUN ? "🧪 MODE DRY-RUN : aucune écriture en base.\n" : "⚡ MODE RÉEL : écritures effectives.\n");
  console.log("→ Étape 1 : mise à jour des équipes existantes\n");

  for (const [oldSlug, newSlug] of Object.entries(SLUG_MIGRATION)) {
    const target = NEW_TEAMS.find((t) => t.slug === newSlug)!;
    const team = await prisma.team.findUnique({ where: { slug: oldSlug } });
    if (team) {
      if (!DRY_RUN) {
        await prisma.team.update({
          where: { id: team.id },
          data: { name: target.name, slug: target.slug, color: target.color, logoUrl: target.logoUrl, description: target.description },
        });
      }
      console.log(`  ${tag("✓")} ${oldSlug} → ${target.name}`);
    } else {
      console.log(`  · ${oldSlug} absente, ignorée`);
    }
  }

  // Upsert pour chaque équipe cible (au cas où l'une manque)
  if (!DRY_RUN) {
    for (const t of NEW_TEAMS) {
      await prisma.team.upsert({
        where: { slug: t.slug },
        update: { name: t.name, color: t.color, logoUrl: t.logoUrl, description: t.description },
        create: { name: t.name, slug: t.slug, color: t.color, logoUrl: t.logoUrl, description: t.description },
      });
    }
  }
  console.log(`  ${tag("✓")} "Sans équipe" garantie présente\n`);

  // Récupère ids (en dry-run, on simule la présence des nouvelles équipes)
  const teamsInDb = await prisma.team.findMany();
  const teamBySlug = new Map(teamsInDb.map((t) => [t.slug, t]));
  if (DRY_RUN) {
    for (const t of NEW_TEAMS) {
      if (!teamBySlug.has(t.slug)) {
        teamBySlug.set(t.slug, { id: `dry-${t.slug}`, name: t.name, slug: t.slug, color: t.color, logoUrl: t.logoUrl, description: t.description, createdAt: new Date() });
      }
    }
  }
  const sansEquipe = teamBySlug.get("sans-equipe")!;

  console.log("→ Étape 2 : création des coureurs manquants\n");
  for (const r of RIDERS_TO_CREATE) {
    const exists = await prisma.rider.findFirst({
      where: { firstName: { startsWith: r.firstName, mode: "insensitive" } },
    });
    if (exists) {
      console.log(`  · ${r.firstName} existe déjà (${exists.firstName})`);
      continue;
    }
    const team = teamBySlug.get(r.teamSlug)!;
    if (!DRY_RUN) {
      await prisma.rider.create({
        data: { firstName: r.firstName, slug: r.slug, teamId: team.id, editionCount: 1 },
      });
    }
    console.log(`  ${tag("✓ Créé")} : ${r.firstName} → ${team.name}`);
  }
  console.log();

  console.log("→ Étape 3 : réaffectation des coureurs selon la composition\n");
  const allRiders = await prisma.rider.findMany();
  const assigned = new Set<string>();

  for (const [teamSlug, composition] of Object.entries(COMPOSITION)) {
    const team = teamBySlug.get(teamSlug)!;
    for (const firstName of composition) {
      const target = normalize(firstName);
      // Match : firstName du rider commence par le prénom de composition (insensible aux accents)
      const matches = allRiders
        .filter((r) => !assigned.has(r.id))
        .filter((r) => {
          const n = normalize(r.firstName);
          return n === target || n.startsWith(target + " ") || n.startsWith(target + "-");
        });
      if (matches.length === 0) {
        console.log(`  ⚠ ${firstName} → ${team.name} : aucun coureur trouvé en DB`);
        continue;
      }
      if (matches.length > 1) {
        console.log(`  ⚠ ${firstName} → ${matches.length} matchs : ${matches.map((m) => m.firstName).join(", ")} (premier retenu)`);
      }
      const rider = matches[0];
      assigned.add(rider.id);
      if (rider.teamId !== team.id) {
        if (!DRY_RUN) {
          await prisma.rider.update({ where: { id: rider.id }, data: { teamId: team.id } });
        }
        console.log(`  ${tag("✓")} ${rider.firstName} → ${team.name}`);
      } else {
        console.log(`  · ${rider.firstName} déjà dans ${team.name}`);
      }
    }
  }
  console.log();

  console.log("→ Étape 4 : déplacement des coureurs hors composition vers \"Sans équipe\"\n");
  for (const rider of allRiders) {
    if (assigned.has(rider.id)) continue;
    if (rider.teamId === sansEquipe.id) {
      console.log(`  · ${rider.firstName} déjà sans équipe`);
      continue;
    }
    if (!DRY_RUN) {
      await prisma.rider.update({ where: { id: rider.id }, data: { teamId: sansEquipe.id } });
    }
    console.log(`  ${tag("✓")} ${rider.firstName} → Sans équipe`);
  }
  console.log();

  // Récap
  console.log("→ Récap final\n");
  const finalTeams = await prisma.team.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { riders: true } } },
  });
  for (const t of finalTeams) {
    console.log(`  ${t.name.padEnd(28)} ${t._count.riders} coureurs`);
  }
  const total = finalTeams.filter((t) => t.slug !== "sans-equipe").reduce((s, t) => s + t._count.riders, 0);
  console.log(`\n  TOTAL en équipe : ${total} coureurs`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
