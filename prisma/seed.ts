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

  // ── Riders (32 coureurs réels) ──────────────────────────────────────
  const riderData: {
    firstName: string;
    nickname?: string;
    teamIndex: number;
    editionCount: number;
  }[] = [
    // Visma Lease a Ricard (8)
    { firstName: "Clément Daguet", teamIndex: 0, editionCount: 1 },
    { firstName: "Sélim Achite", teamIndex: 0, editionCount: 1 },
    { firstName: "Ronan Thomas", teamIndex: 0, editionCount: 1 },
    { firstName: "Gabriel Berthet-Nivon", teamIndex: 0, editionCount: 1 },
    { firstName: "Louison Timmerman", teamIndex: 0, editionCount: 1 },
    { firstName: "Romain Choler", teamIndex: 0, editionCount: 1 },
    { firstName: "Thierry Daguet", teamIndex: 0, editionCount: 1 },
    { firstName: "Kévin Lorenzo", teamIndex: 0, editionCount: 1 },

    // EAU Team Pastis (8)
    { firstName: "Antoine Bailly", teamIndex: 1, editionCount: 1 },
    { firstName: "Nicolas Debray", teamIndex: 1, editionCount: 1 },
    { firstName: "Maxime Lovat", teamIndex: 1, editionCount: 1 },
    { firstName: "Robin Vouillot", teamIndex: 1, editionCount: 1 },
    { firstName: "Jules Seguin", teamIndex: 1, editionCount: 1 },
    { firstName: "Stanoche", teamIndex: 1, editionCount: 1 },
    { firstName: "Anselme Gautier", teamIndex: 1, editionCount: 1 },
    { firstName: "Benjamin", teamIndex: 1, editionCount: 1 },

    // Groupama Fédération du Jaune (8)
    { firstName: "Ambre", teamIndex: 2, editionCount: 1 },
    { firstName: "Eve Moins", teamIndex: 2, editionCount: 1 },
    { firstName: "Louise Loisel", teamIndex: 2, editionCount: 1 },
    { firstName: "Gaëlle", teamIndex: 2, editionCount: 1 },
    { firstName: "Lucie Dupont", teamIndex: 2, editionCount: 1 },
    { firstName: "Coco", teamIndex: 2, editionCount: 1 },
    { firstName: "Inès", teamIndex: 2, editionCount: 1 },
    { firstName: "Caroline Joseph", teamIndex: 2, editionCount: 1 },

    // INEOS Anisés (8)
    { firstName: "Antonin La Bohérie", teamIndex: 3, editionCount: 1 },
    { firstName: "Florian Barraz", teamIndex: 3, editionCount: 1 },
    { firstName: "Mathieu Surirey", teamIndex: 3, editionCount: 1 },
    { firstName: "Quentin Lambert", teamIndex: 3, editionCount: 1 },
    { firstName: "Luc", teamIndex: 3, editionCount: 1 },
    { firstName: "Valentin Beggi", teamIndex: 3, editionCount: 1 },
    { firstName: "Valentin Guillou", teamIndex: 3, editionCount: 1 },
    { firstName: "Anatole Oraison", teamIndex: 3, editionCount: 1 },
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
          funFacts: {},
        },
      });
    })
  );

  console.log(`✅ ${riders.length} coureurs créés`);

  // ── Stages (données réelles des GPX) ──────────────────────────────────────
  const stages = await Promise.all([
    prisma.stage.create({
      data: {
        number: 1,
        name: "Voiron — Boucle accidentée",
        type: StageType.road,
        date: new Date("2026-07-20T08:00:00Z"),
        distanceKm: 75.4,
        elevationM: 992,
        gpxUrl: "/gpx/etape-1-voiron.gpx",
      },
    }),
    prisma.stage.create({
      data: {
        number: 2,
        name: "CLM par équipe — Voiron",
        type: StageType.team_tt,
        date: new Date("2026-07-21T09:00:00Z"),
        distanceKm: 34.5,
        elevationM: 226,
        gpxUrl: "/gpx/etape-2-clm-equipe.gpx",
      },
    }),
    prisma.stage.create({
      data: {
        number: 3,
        name: "CLM individuel — Voiron",
        type: StageType.individual_tt,
        date: new Date("2026-07-22T09:00:00Z"),
        distanceKm: 32.4,
        elevationM: 179,
        gpxUrl: "/gpx/etape-3-clm-individuel.gpx",
      },
    }),
    prisma.stage.create({
      data: {
        number: 4,
        name: "Montagne — Col de la Croix de Fer",
        type: StageType.mountain,
        date: new Date("2026-07-23T07:30:00Z"),
        distanceKm: 100.7,
        elevationM: 2330,
        gpxUrl: "/gpx/etape-4-croix-de-fer.gpx",
      },
    }),
    prisma.stage.create({
      data: {
        number: 5,
        name: "Montagne — Alpe d'Huez",
        type: StageType.mountain,
        date: new Date("2026-07-24T07:30:00Z"),
        distanceKm: 68.4,
        elevationM: 2185,
        gpxUrl: "/gpx/etape-5-alpe-dhuez.gpx",
      },
    }),
    prisma.stage.create({
      data: {
        number: 6,
        name: "Montagne — Lautaret + Sarennes",
        type: StageType.mountain,
        date: new Date("2026-07-25T07:30:00Z"),
        distanceKm: 64.8,
        elevationM: 2119,
        gpxUrl: "/gpx/etape-6-lautaret-sarennes.gpx",
      },
    }),
  ]);

  console.log(`✅ ${stages.length} étapes créées`);

  // ── Checkpoints (départ + arrivée depuis les GPX réels) ──────────────────
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
    // Étape 1 — Voiron boucle (75.4 km, 992m D+)
    { stageIndex: 0, name: "Départ", type: "start", lat: 45.3972, lng: 5.3239, radiusM: 80, order: 1, kmFromStart: 0, elevation: 355 },
    { stageIndex: 0, name: "Arrivée", type: "finish", lat: 45.3969, lng: 5.3238, radiusM: 80, order: 2, kmFromStart: 75.4, elevation: 355 },

    // Étape 2 — CLM par équipe (34.5 km, 226m D+)
    { stageIndex: 1, name: "Départ CLM équipe", type: "start", lat: 45.3937, lng: 5.2627, radiusM: 80, order: 1, kmFromStart: 0, elevation: 347 },
    { stageIndex: 1, name: "Arrivée CLM équipe", type: "finish", lat: 45.3936, lng: 5.2626, radiusM: 80, order: 2, kmFromStart: 34.5, elevation: 347 },

    // Étape 3 — CLM individuel (32.4 km, 179m D+)
    { stageIndex: 2, name: "Départ CLM individuel", type: "start", lat: 45.3927, lng: 5.2622, radiusM: 80, order: 1, kmFromStart: 0, elevation: 310 },
    { stageIndex: 2, name: "Arrivée CLM individuel", type: "finish", lat: 45.3925, lng: 5.2622, radiusM: 80, order: 2, kmFromStart: 32.4, elevation: 310 },

    // Étape 4 — Croix de Fer (100.7 km, 2330m D+)
    { stageIndex: 3, name: "Départ", type: "start", lat: 45.0449, lng: 6.1365, radiusM: 80, order: 1, kmFromStart: 0, elevation: 712 },
    { stageIndex: 3, name: "Sommet Croix de Fer", type: "col", lat: 45.2260, lng: 6.1980, radiusM: 150, order: 2, kmFromStart: 55, elevation: 2073 },
    { stageIndex: 3, name: "Arrivée", type: "finish", lat: 45.0451, lng: 6.1362, radiusM: 80, order: 3, kmFromStart: 100.7, elevation: 712 },

    // Étape 5 — Alpe d'Huez (68.4 km, 2185m D+)
    { stageIndex: 4, name: "Départ", type: "start", lat: 45.0436, lng: 6.2825, radiusM: 80, order: 1, kmFromStart: 0, elevation: 712 },
    { stageIndex: 4, name: "Sommet Alpe d'Huez", type: "col", lat: 45.0910, lng: 6.0710, radiusM: 150, order: 2, kmFromStart: 50, elevation: 1850 },
    { stageIndex: 4, name: "Arrivée", type: "finish", lat: 45.0434, lng: 6.2813, radiusM: 80, order: 3, kmFromStart: 68.4, elevation: 712 },

    // Étape 6 — Lautaret + Sarennes (64.8 km, 2119m D+)
    { stageIndex: 5, name: "Départ", type: "start", lat: 45.0463, lng: 6.3084, radiusM: 80, order: 1, kmFromStart: 0, elevation: 1067 },
    { stageIndex: 5, name: "Col du Lautaret", type: "col", lat: 45.0360, lng: 6.4030, radiusM: 150, order: 2, kmFromStart: 25, elevation: 2005 },
    { stageIndex: 5, name: "Col de Sarenne", type: "col", lat: 45.0790, lng: 6.1080, radiusM: 150, order: 3, kmFromStart: 50, elevation: 1999 },
    { stageIndex: 5, name: "Arrivée", type: "finish", lat: 45.0464, lng: 6.3085, radiusM: 80, order: 4, kmFromStart: 64.8, elevation: 1067 },
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
  console.log(`   ${riders.length} coureurs · ${stages.length} étapes · ${checkpoints.length} checkpoints`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
