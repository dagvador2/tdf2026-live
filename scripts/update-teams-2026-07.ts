import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const teams = await prisma.team.findMany();
  const teamBySlug = Object.fromEntries(teams.map((t) => [t.slug, t]));

  const eauTeam = teamBySlug["eau-pastis-xrg"];
  const desGlaconsTeam = teamBySlug["des-glacons-cma-cgm"];
  const vismaTeam = teamBySlug["visma-ricard"];
  const sansEquipeTeam = teamBySlug["sans-equipe"];

  if (!eauTeam || !desGlaconsTeam || !vismaTeam || !sansEquipeTeam) {
    throw new Error("Équipe introuvable — vérifier les slugs");
  }

  // 1. Supprimer Anselme Gautier, Anatole Oraison, Valentin Guillou, Luc
  const toDelete = ["Anselme Gautier", "Anatole Oraison", "Valentin Guillou", "Luc"];
  for (const name of toDelete) {
    const rider = await prisma.rider.findFirst({ where: { firstName: name } });
    if (rider) {
      const entries = await prisma.stageEntry.findMany({ where: { riderId: rider.id }, select: { id: true } });
      const entryIds = entries.map((e) => e.id);
      if (entryIds.length > 0) {
        await prisma.timeRecord.deleteMany({ where: { entryId: { in: entryIds } } });
        await prisma.gpsPosition.deleteMany({ where: { entryId: { in: entryIds } } });
        await prisma.stageEntry.deleteMany({ where: { riderId: rider.id } });
      }
      await prisma.rider.delete({ where: { id: rider.id } });
      console.log(`🗑️  Supprimé : ${name}`);
    } else {
      console.log(`⚠️  Introuvable : ${name}`);
    }
  }

  // 2. Florian Barraz : Visma Ricard → Des Glaçons CMA CGM
  const florian = await prisma.rider.findFirst({ where: { firstName: "Florian Barraz" } });
  if (florian) {
    await prisma.rider.update({ where: { id: florian.id }, data: { teamId: desGlaconsTeam.id } });
    console.log("✅ Florian Barraz → Des Glaçons CMA CGM");
  }

  // 3. Louison Timmerman : Des Glaçons → Visma Ricard
  const louison = await prisma.rider.findFirst({ where: { firstName: "Louison Timmerman" } });
  if (louison) {
    await prisma.rider.update({ where: { id: louison.id }, data: { teamId: vismaTeam.id } });
    console.log("✅ Louison Timmerman → Visma Ricard");
  }

  // 4. Luc (EAU) → Sans équipe
  const luc = await prisma.rider.findFirst({ where: { firstName: "Luc" } });
  if (luc) {
    await prisma.rider.update({ where: { id: luc.id }, data: { teamId: sansEquipeTeam.id } });
    console.log("➡️  Luc → Sans équipe");
  }

  // 6. Ajouter Patrick Pham dans EAU Pastis XRG
  const existingPatrick = await prisma.rider.findFirst({ where: { firstName: "Patrick Pham" } });
  if (!existingPatrick) {
    await prisma.rider.create({
      data: {
        firstName: "Patrick Pham",
        slug: "patrick-pham",
        teamId: eauTeam.id,
        editionCount: 1,
        funFacts: {},
      },
    });
    console.log("✅ Patrick Pham → EAU Pastis XRG");
  } else {
    console.log("⚠️  Patrick Pham existe déjà");
  }

  // 7. Ajouter Thomas Barsack dans Visma Ricard
  const existingThomas = await prisma.rider.findFirst({ where: { firstName: "Thomas Barsack" } });
  if (!existingThomas) {
    await prisma.rider.create({
      data: {
        firstName: "Thomas Barsack",
        slug: "thomas-barsack",
        teamId: vismaTeam.id,
        editionCount: 1,
        funFacts: {},
      },
    });
    console.log("✅ Thomas Barsack → Visma Ricard");
  } else {
    console.log("⚠️  Thomas Barsack existe déjà");
  }

  console.log("\n🎉 Mise à jour terminée !");

  // Afficher le résumé final
  const finalTeams = await prisma.team.findMany({
    include: { riders: { orderBy: { firstName: "asc" } } },
    orderBy: { name: "asc" },
  });
  for (const team of finalTeams) {
    const names = team.riders.map((r) => r.firstName).join(" · ");
    console.log(`\n${team.name} (${team.riders.length}) : ${names}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
