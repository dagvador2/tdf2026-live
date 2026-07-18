/**
 * Audit lecture seule avant départ : état réel de la DB
 * (étapes, checkpoints, effectifs, paramètres de scoring, inscriptions).
 * Aucune écriture. À supprimer après l'audit.
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
    if (!process.env[t.slice(0, i)])
      process.env[t.slice(0, i)] = t.slice(i + 1).replace(/^["']|["']$/g, "");
  }
}

async function main() {
  const p = new PrismaClient();

  console.log("=== ÉTAPES ===");
  const stages = await p.stage.findMany({
    orderBy: { number: "asc" },
    include: { checkpoints: { orderBy: { order: "asc" } } },
  });
  for (const s of stages) {
    console.log(
      `\nÉ${s.number} — ${s.name} | type=${s.type} | ${s.distanceKm}km ${s.elevationM}mD+ | status=${s.status}`
    );
    console.log(
      `   gpx=${s.gpxUrl} | ttNthRider=${s.ttNthRider} | teamTopN=${s.teamTopN} | gcMode=${s.gcMode}`
    );
    for (const c of s.checkpoints) {
      console.log(
        `   CP${c.order} [${c.type}] ${c.name} — km ${c.kmFromStart}, alt ${c.elevation ?? "?"}m, (${c.latitude.toFixed(4)}, ${c.longitude.toFixed(4)}), r=${c.radiusM}m`
      );
    }
  }

  console.log("\n=== ÉQUIPES / EFFECTIFS ===");
  const teams = await p.team.findMany({
    include: { riders: { orderBy: { firstName: "asc" } } },
    orderBy: { name: "asc" },
  });
  for (const t of teams) {
    console.log(`\n${t.name} (${t.riders.length}) [${t.slug}]`);
    console.log("   " + t.riders.map((r) => r.firstName).join(" · "));
  }

  console.log("\n=== INSCRIPTIONS PAR ÉTAPE (entries) ===");
  const entries = await p.stageEntry.findMany({
    include: {
      stage: { select: { number: true } },
      rider: { select: { firstName: true, team: { select: { name: true } } } },
    },
  });
  const byStage = new Map<number, Map<string, number>>();
  for (const e of entries) {
    if (e.stage.number < 1) continue;
    if (!byStage.has(e.stage.number)) byStage.set(e.stage.number, new Map());
    const m = byStage.get(e.stage.number)!;
    const team = e.rider.team.name;
    m.set(team, (m.get(team) ?? 0) + 1);
  }
  for (const [num, m] of [...byStage.entries()].sort((a, b) => a[0] - b[0])) {
    const parts = [...m.entries()].map(([t, n]) => `${t}: ${n}`).join(" | ");
    console.log(`É${num} → ${parts}`);
  }
  if (byStage.size === 0) console.log("(aucune inscription trouvée)");

  await p.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
