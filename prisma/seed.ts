import { PrismaClient, StageType, CheckpointType } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // Clear existing data (order matters for FK constraints)
  await prisma.gpsPosition.deleteMany();
  await prisma.timeRecord.deleteMany();
  await prisma.stageEntry.deleteMany();
  await prisma.checkpoint.deleteMany();
  await prisma.livePost.deleteMany();
  await prisma.rider.deleteMany();
  await prisma.stage.deleteMany();
  await prisma.team.deleteMany();
  await prisma.adminUser.deleteMany();

  console.log("🗑️  Base nettoyée");

  // ── Teams ──────────────────────────────────────
  const teams = await Promise.all([
    prisma.team.create({
      data: {
        name: "Visma Lease a Ricard",
        slug: "visma-lease-a-ricard",
        color: "#F2C200",
        description: "L'équipe jaune, la couleur du maillot et du pastis.",
      },
    }),
    prisma.team.create({
      data: {
        name: "EAU Team Pastis",
        slug: "eau-team-pastis",
        color: "#E8E0D0",
        description: "Quand l'eau se mélange au pastis, ça donne du style.",
      },
    }),
    prisma.team.create({
      data: {
        name: "Groupama Fédération du Jaune",
        slug: "groupama-federation-du-jaune",
        color: "#0055A4",
        description: "Les bleus qui voient la vie en jaune.",
      },
    }),
    prisma.team.create({
      data: {
        name: "INEOS Anisés",
        slug: "ineos-anises",
        color: "#E03C31",
        description: "La puissance britannique au goût d'anis.",
      },
    }),
  ]);

  console.log(`✅ ${teams.length} équipes créées`);

  // ── Riders ──────────────────────────────────────
  const riderData: {
    firstName: string;
    nickname?: string;
    teamIndex: number;
    editionCount: number;
  }[] = [
    // Visma Lease a Ricard (9 coureurs)
    { firstName: "Antoine", nickname: "Le Pharaon", teamIndex: 0, editionCount: 3 },
    { firstName: "Clément", teamIndex: 0, editionCount: 3 },
    { firstName: "Thomas", nickname: "Tom Tom", teamIndex: 0, editionCount: 2 },
    { firstName: "Julien", teamIndex: 0, editionCount: 1 },
    { firstName: "Maxime", nickname: "Mad Max", teamIndex: 0, editionCount: 2 },
    { firstName: "Nicolas", teamIndex: 0, editionCount: 1 },
    { firstName: "Pierre", teamIndex: 0, editionCount: 3 },
    { firstName: "Romain", teamIndex: 0, editionCount: 2 },
    { firstName: "Baptiste", teamIndex: 0, editionCount: 1 },
    // EAU Team Pastis (9 coureurs)
    { firstName: "Alexandre", nickname: "Alex", teamIndex: 1, editionCount: 2 },
    { firstName: "Mathieu", teamIndex: 1, editionCount: 3 },
    { firstName: "Guillaume", nickname: "Will", teamIndex: 1, editionCount: 1 },
    { firstName: "Florian", teamIndex: 1, editionCount: 2 },
    { firstName: "Sébastien", teamIndex: 1, editionCount: 1 },
    { firstName: "Vincent", nickname: "Vince", teamIndex: 1, editionCount: 3 },
    { firstName: "Damien", teamIndex: 1, editionCount: 1 },
    { firstName: "Adrien", teamIndex: 1, editionCount: 2 },
    { firstName: "Hugo", teamIndex: 1, editionCount: 1 },
    // Groupama Fédération du Jaune (8 coureurs)
    { firstName: "Lucas", nickname: "Lulu", teamIndex: 2, editionCount: 2 },
    { firstName: "Théo", teamIndex: 2, editionCount: 1 },
    { firstName: "Raphaël", teamIndex: 2, editionCount: 3 },
    { firstName: "Benoît", nickname: "Ben", teamIndex: 2, editionCount: 2 },
    { firstName: "Jérôme", teamIndex: 2, editionCount: 1 },
    { firstName: "François", teamIndex: 2, editionCount: 2 },
    { firstName: "Olivier", teamIndex: 2, editionCount: 3 },
    { firstName: "Arnaud", teamIndex: 2, editionCount: 1 },
    // INEOS Anisés (8 coureurs)
    { firstName: "Éric", nickname: "Rico", teamIndex: 3, editionCount: 3 },
    { firstName: "David", teamIndex: 3, editionCount: 2 },
    { firstName: "Laurent", nickname: "Lolo", teamIndex: 3, editionCount: 1 },
    { firstName: "Cédric", teamIndex: 3, editionCount: 2 },
    { firstName: "Stéphane", teamIndex: 3, editionCount: 1 },
    { firstName: "Christophe", nickname: "Cricri", teamIndex: 3, editionCount: 3 },
    { firstName: "Yannick", teamIndex: 3, editionCount: 2 },
    { firstName: "Fabien", teamIndex: 3, editionCount: 1 },
  ];

  const slugCount: Record<string, number> = {};
  const riders = await Promise.all(
    riderData.map((r) => {
      const baseSlug = r.firstName
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/\s+/g, "-");
      slugCount[baseSlug] = (slugCount[baseSlug] || 0) + 1;
      const slug =
        slugCount[baseSlug] > 1
          ? `${baseSlug}-${slugCount[baseSlug]}`
          : baseSlug;

      return prisma.rider.create({
        data: {
          firstName: r.firstName,
          nickname: r.nickname,
          slug,
          teamId: teams[r.teamIndex].id,
          editionCount: r.editionCount,
          funFacts: {
            coureur_tdf_2025: "Pogačar",
            coureur_all_time: "Pantani",
            souvenir_tour: "L'Alpe d'Huez 2001",
            marque_velo_reve: "Pinarello",
            col_prefere: "Col du Galibier",
            pire_souvenir_velo: "Crevaison sous la pluie",
            meilleur_souvenir_velo: "Lever de soleil au Ventoux",
            surnom_velo: "La Flèche",
            chanson_col: "Eye of the Tiger",
            boisson_apres_3000m: "Un bon pastis bien frais",
            excuse_col: "C'est le vent de face",
          },
        },
      });
    })
  );

  console.log(`✅ ${riders.length} coureurs créés`);

  // ── Stages ──────────────────────────────────────
  const stages = await Promise.all([
    prisma.stage.create({
      data: {
        number: 1,
        name: "Sortie accidentée",
        type: StageType.road,
        date: new Date("2026-07-20T08:00:00Z"),
        distanceKm: 75.5,
        elevationM: 969,
      },
    }),
    prisma.stage.create({
      data: {
        number: 2,
        name: "CLM par équipe",
        type: StageType.team_tt,
        date: new Date("2026-07-21T09:00:00Z"),
        distanceKm: 34.6,
        elevationM: 219,
      },
    }),
    prisma.stage.create({
      data: {
        number: 3,
        name: "CLM individuel",
        type: StageType.individual_tt,
        date: new Date("2026-07-22T09:00:00Z"),
        distanceKm: 32.5,
        elevationM: 174,
      },
    }),
    prisma.stage.create({
      data: {
        number: 4,
        name: "Col de la Croix de Fer",
        type: StageType.mountain,
        date: new Date("2026-07-23T07:30:00Z"),
        distanceKm: 100.8,
        elevationM: 2291,
      },
    }),
    prisma.stage.create({
      data: {
        number: 5,
        name: "Alpe d'Huez",
        type: StageType.mountain,
        date: new Date("2026-07-24T07:30:00Z"),
        distanceKm: 68.5,
        elevationM: 2171,
      },
    }),
    prisma.stage.create({
      data: {
        number: 6,
        name: "Lautaret + Sarennes",
        type: StageType.mountain,
        date: new Date("2026-07-25T07:30:00Z"),
        distanceKm: 68.3,
        elevationM: 2203,
      },
    }),
  ]);

  console.log(`✅ ${stages.length} étapes créées`);

  // ── Checkpoints ──────────────────────────────────
  const checkpointsData: {
    stageIndex: number;
    name: string;
    type: CheckpointType;
    lat: number;
    lng: number;
    radiusM: number;
    order: number;
    kmFromStart: number;
    elevation?: number;
  }[] = [
    // Étape 1 — Sortie accidentée (Voiron area)
    { stageIndex: 0, name: "Départ Voiron", type: "start", lat: 45.3626, lng: 5.5911, radiusM: 50, order: 1, kmFromStart: 0, elevation: 290 },
    { stageIndex: 0, name: "Col de la Placette", type: "col", lat: 45.3567, lng: 5.6823, radiusM: 80, order: 2, kmFromStart: 18.5, elevation: 582 },
    { stageIndex: 0, name: "Sprint Saint-Laurent-du-Pont", type: "sprint", lat: 45.3881, lng: 5.7349, radiusM: 50, order: 3, kmFromStart: 35.2, elevation: 410 },
    { stageIndex: 0, name: "Col du Coq", type: "col", lat: 45.3084, lng: 5.7695, radiusM: 100, order: 4, kmFromStart: 55.0, elevation: 1434 },
    { stageIndex: 0, name: "Arrivée Voiron", type: "finish", lat: 45.3648, lng: 5.5890, radiusM: 50, order: 5, kmFromStart: 75.5, elevation: 290 },

    // Étape 2 — CLM par équipe (plat, Voiron)
    { stageIndex: 1, name: "Départ CLM Voiron", type: "start", lat: 45.3626, lng: 5.5911, radiusM: 50, order: 1, kmFromStart: 0, elevation: 290 },
    { stageIndex: 1, name: "Intermédiaire Tullins", type: "sprint", lat: 45.3014, lng: 5.4888, radiusM: 50, order: 2, kmFromStart: 14.5, elevation: 220 },
    { stageIndex: 1, name: "Demi-tour Vinay", type: "sprint", lat: 45.2118, lng: 5.4057, radiusM: 50, order: 3, kmFromStart: 22.3, elevation: 260 },
    { stageIndex: 1, name: "Arrivée CLM Voiron", type: "finish", lat: 45.3635, lng: 5.5920, radiusM: 50, order: 4, kmFromStart: 34.6, elevation: 290 },

    // Étape 3 — CLM individuel
    { stageIndex: 2, name: "Départ CLM individuel", type: "start", lat: 45.3626, lng: 5.5911, radiusM: 50, order: 1, kmFromStart: 0, elevation: 290 },
    { stageIndex: 2, name: "Sprint Moirans", type: "sprint", lat: 45.3267, lng: 5.5621, radiusM: 50, order: 2, kmFromStart: 10.2, elevation: 205 },
    { stageIndex: 2, name: "Demi-tour Rives", type: "sprint", lat: 45.3548, lng: 5.5021, radiusM: 50, order: 3, kmFromStart: 20.0, elevation: 240 },
    { stageIndex: 2, name: "Arrivée CLM individuel", type: "finish", lat: 45.3640, lng: 5.5905, radiusM: 50, order: 4, kmFromStart: 32.5, elevation: 290 },

    // Étape 4 — Col de la Croix de Fer
    { stageIndex: 3, name: "Départ Saint-Jean-de-Maurienne", type: "start", lat: 45.2752, lng: 6.3469, radiusM: 50, order: 1, kmFromStart: 0, elevation: 550 },
    { stageIndex: 3, name: "Pied Croix de Fer", type: "col", lat: 45.2521, lng: 6.2531, radiusM: 100, order: 2, kmFromStart: 28.5, elevation: 840 },
    { stageIndex: 3, name: "Lacets du Mollard", type: "sprint", lat: 45.2390, lng: 6.2180, radiusM: 80, order: 3, kmFromStart: 42.0, elevation: 1480 },
    { stageIndex: 3, name: "Sommet Croix de Fer", type: "col", lat: 45.2260, lng: 6.1980, radiusM: 100, order: 4, kmFromStart: 55.3, elevation: 2067 },
    { stageIndex: 3, name: "Col du Glandon", type: "col", lat: 45.2375, lng: 6.1760, radiusM: 100, order: 5, kmFromStart: 62.0, elevation: 1924 },
    { stageIndex: 3, name: "Arrivée Allemond", type: "finish", lat: 45.2098, lng: 6.0337, radiusM: 50, order: 6, kmFromStart: 100.8, elevation: 720 },

    // Étape 5 — Alpe d'Huez
    { stageIndex: 4, name: "Départ Bourg-d'Oisans", type: "start", lat: 45.0546, lng: 6.0298, radiusM: 50, order: 1, kmFromStart: 0, elevation: 720 },
    { stageIndex: 4, name: "Pied de l'Alpe", type: "col", lat: 45.0610, lng: 6.0350, radiusM: 100, order: 2, kmFromStart: 3.0, elevation: 740 },
    { stageIndex: 4, name: "Virage 15 - La Garde", type: "sprint", lat: 45.0720, lng: 6.0450, radiusM: 80, order: 3, kmFromStart: 8.5, elevation: 1100 },
    { stageIndex: 4, name: "Virage 7 - Huez", type: "sprint", lat: 45.0820, lng: 6.0580, radiusM: 80, order: 4, kmFromStart: 12.5, elevation: 1450 },
    { stageIndex: 4, name: "Sommet Alpe d'Huez", type: "finish", lat: 45.0910, lng: 6.0710, radiusM: 100, order: 5, kmFromStart: 14.5, elevation: 1850 },

    // Étape 6 — Lautaret + Sarennes
    { stageIndex: 5, name: "Départ Le Bourg-d'Oisans", type: "start", lat: 45.0546, lng: 6.0298, radiusM: 50, order: 1, kmFromStart: 0, elevation: 720 },
    { stageIndex: 5, name: "La Grave", type: "sprint", lat: 45.0455, lng: 6.3066, radiusM: 80, order: 2, kmFromStart: 25.0, elevation: 1450 },
    { stageIndex: 5, name: "Sommet Col du Lautaret", type: "col", lat: 45.0360, lng: 6.4030, radiusM: 100, order: 3, kmFromStart: 35.5, elevation: 2058 },
    { stageIndex: 5, name: "Descente Villar-d'Arêne", type: "sprint", lat: 45.0400, lng: 6.3400, radiusM: 80, order: 4, kmFromStart: 45.0, elevation: 1650 },
    { stageIndex: 5, name: "Col de Sarenne", type: "col", lat: 45.0790, lng: 6.1080, radiusM: 100, order: 5, kmFromStart: 58.0, elevation: 1999 },
    { stageIndex: 5, name: "Arrivée Alpe d'Huez", type: "finish", lat: 45.0910, lng: 6.0710, radiusM: 100, order: 6, kmFromStart: 68.3, elevation: 1850 },
  ];

  const checkpoints = await Promise.all(
    checkpointsData.map((cp) =>
      prisma.checkpoint.create({
        data: {
          stageId: stages[cp.stageIndex].id,
          name: cp.name,
          type: cp.type,
          latitude: cp.lat,
          longitude: cp.lng,
          radiusM: cp.radiusM,
          order: cp.order,
          kmFromStart: cp.kmFromStart,
          elevation: cp.elevation,
        },
      })
    )
  );

  console.log(`✅ ${checkpoints.length} checkpoints créés`);

  // ── Stage Entries (20 coureurs inscrits à l'étape 1) ──
  const stage1Riders = riders.slice(0, 20);
  const entries = await Promise.all(
    stage1Riders.map((rider) =>
      prisma.stageEntry.create({
        data: {
          riderId: rider.id,
          stageId: stages[0].id,
        },
      })
    )
  );

  console.log(`✅ ${entries.length} inscriptions à l'étape 1`);

  // ── Admin Users ──────────────────────────────────
  const admins = await Promise.all([
    prisma.adminUser.create({
      data: {
        email: "admin@tdf2026.fr",
        password: await bcrypt.hash("admin2026", 10),
        displayName: "Admin TDF",
      },
    }),
    prisma.adminUser.create({
      data: {
        email: "clement@tdf2026.fr",
        password: await bcrypt.hash("clement2026", 10),
        displayName: "Clément",
      },
    }),
  ]);

  console.log(`✅ ${admins.length} admins créés`);

  console.log("\n🎉 Seed terminé !");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
