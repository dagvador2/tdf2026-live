/**
 * Inversion des deux CLM (décision logistique du 21/07 au matin) :
 *   É2 (mardi 21/07)   → CLM individuel
 *   É3 (mercredi 22/07) → CLM par équipe
 * Les deux étapes passent sur le MÊME nouveau tracé (public/gpx/etape-2-3-clm-voiron.gpx,
 * 33,6 km / 243 m D+, boucle départ ≈ arrivée), checkpoints start/finish recréés.
 *
 * Garde-fous : refuse d'agir si une des deux étapes n'est plus "upcoming" ou si
 * des temps / positions GPS existent déjà.
 *
 * Usage : npx tsx scripts/swap-clm-e2-e3-2026-07-21.ts
 */
import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";

const envPath = path.resolve(__dirname, "../.env.local");
if (fs.existsSync(envPath)) {
  for (const l of fs.readFileSync(envPath, "utf-8").split("\n")) {
    const t = l.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i < 0) continue;
    if (!process.env[t.slice(0, i)]) process.env[t.slice(0, i)] = t.slice(i + 1).replace(/^["']|["']$/g, "");
  }
}

const prisma = new PrismaClient();

const GPX_URL = "/gpx/etape-2-3-clm-voiron.gpx";
const DISTANCE_KM = 33.6;
const ELEVATION_M = 243;
// Extraits du GPX (scripts/parse-clm-gpx-2026-07-21.ts)
const START = { lat: 45.392084727063775, lng: 5.257080467417836, ele: 373 };
const FINISH = { lat: 45.393414264544845, lng: 5.256334226578474, ele: 379 };

async function main() {
  const [e2, e3] = await Promise.all([
    prisma.stage.findUnique({ where: { number: 2 } }),
    prisma.stage.findUnique({ where: { number: 3 } }),
  ]);
  if (!e2 || !e3) throw new Error("É2 ou É3 introuvable");

  for (const s of [e2, e3]) {
    if (s.status !== "upcoming") {
      throw new Error(`É${s.number} a le statut "${s.status}" (attendu: upcoming) — abandon`);
    }
    const [records, positions] = await Promise.all([
      prisma.timeRecord.count({ where: { entry: { stageId: s.id } } }),
      prisma.gpsPosition.count({ where: { entry: { stageId: s.id } } }),
    ]);
    if (records > 0 || positions > 0) {
      throw new Error(`É${s.number} a déjà ${records} temps / ${positions} positions — abandon`);
    }
  }

  console.log(`Avant : É2 ${e2.type} "${e2.name}" (N=${e2.ttNthRider}, topN=${e2.teamTopN})`);
  console.log(`        É3 ${e3.type} "${e3.name}" (N=${e3.ttNthRider}, topN=${e3.teamTopN})`);

  // É2 → CLM individuel ; É3 → CLM par équipe (les configs N suivent le type)
  await prisma.$transaction([
    prisma.checkpoint.deleteMany({ where: { stageId: { in: [e2.id, e3.id] } } }),
    prisma.stage.update({
      where: { id: e2.id },
      data: {
        name: "CLM individuel — Voiron",
        type: "individual_tt",
        distanceKm: DISTANCE_KM,
        elevationM: ELEVATION_M,
        gpxUrl: GPX_URL,
        ttNthRider: e3.ttNthRider,
        teamTopN: e3.teamTopN,
      },
    }),
    prisma.stage.update({
      where: { id: e3.id },
      data: {
        name: "CLM par équipe — Voiron",
        type: "team_tt",
        distanceKm: DISTANCE_KM,
        elevationM: ELEVATION_M,
        gpxUrl: GPX_URL,
        ttNthRider: e2.ttNthRider,
        teamTopN: e2.teamTopN,
      },
    }),
    prisma.checkpoint.createMany({
      data: [
        { stageId: e2.id, name: "Départ CLM individuel", type: "start", latitude: START.lat, longitude: START.lng, radiusM: 80, order: 1, kmFromStart: 0, elevation: START.ele },
        { stageId: e2.id, name: "Arrivée CLM individuel", type: "finish", latitude: FINISH.lat, longitude: FINISH.lng, radiusM: 80, order: 2, kmFromStart: DISTANCE_KM, elevation: FINISH.ele },
        { stageId: e3.id, name: "Départ CLM équipe", type: "start", latitude: START.lat, longitude: START.lng, radiusM: 80, order: 1, kmFromStart: 0, elevation: START.ele },
        { stageId: e3.id, name: "Arrivée CLM équipe", type: "finish", latitude: FINISH.lat, longitude: FINISH.lng, radiusM: 80, order: 2, kmFromStart: DISTANCE_KM, elevation: FINISH.ele },
      ],
    }),
  ]);

  const after = await prisma.stage.findMany({
    where: { number: { in: [2, 3] } },
    orderBy: { number: "asc" },
    include: { checkpoints: { orderBy: { order: "asc" } } },
  });
  for (const s of after) {
    console.log(`Après : É${s.number} ${s.type} "${s.name}" | ${s.distanceKm} km, ${s.elevationM} m D+ | gpx=${s.gpxUrl}`);
    for (const c of s.checkpoints) {
      console.log(`         ${c.type} "${c.name}" (${c.latitude.toFixed(5)}, ${c.longitude.toFixed(5)}) r=${c.radiusM} m, km ${c.kmFromStart}`);
    }
  }
  console.log("✅ Inversion É2/É3 + nouveau tracé appliqués");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
