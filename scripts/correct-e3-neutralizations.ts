/**
 * É3 (CLM par équipe) — neutralisations de temps pour force majeure :
 *   - Des Glaçons CMA CGM : −1:20 (chute, temps d'arrêt/redémarrage)
 *   - RedBull Vodka Hangover : −0:30 (camion en travers de la route)
 *
 * Sur un CLM équipe tous les coureurs d'une équipe ont le même temps ; on
 * retranche la correction au chrono (finish) de CHAQUE coureur de l'équipe.
 * Le temps brut d'équipe baisse d'autant ; le score au général baisse de
 * (correction × présence) puisque le CLM équipe compte le Kᵉ × présence.
 *
 * Dry-run par défaut. --apply pour écrire. NE PAS relancer avec --apply
 * (retrancherait une seconde fois).
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

const fmt = (ms: number) => {
  const t = Math.round(ms / 1000);
  return (
    Math.floor(t / 3600) +
    ":" +
    String(Math.floor((t % 3600) / 60)).padStart(2, "0") +
    ":" +
    String(t % 60).padStart(2, "0")
  );
};

const CORRECTIONS: { slug: string; seconds: number; reason: string }[] = [
  { slug: "des-glacons-cma-cgm", seconds: 80, reason: "neutralisation chute (-1:20)" },
  { slug: "redbull-vodka-hangover", seconds: 30, reason: "neutralisation camion (-0:30)" },
];

async function main() {
  const apply = process.argv.includes("--apply");
  const prisma = new PrismaClient();

  const stage = await prisma.stage.findUnique({ where: { number: 3 } });
  if (!stage) throw new Error("É3 introuvable");
  if (stage.type !== "team_tt") throw new Error(`É3 n'est pas un team_tt (${stage.type})`);

  for (const corr of CORRECTIONS) {
    const entries = await prisma.stageEntry.findMany({
      where: { stageId: stage.id, rider: { team: { slug: corr.slug } } },
      include: {
        rider: { select: { firstName: true, team: { select: { name: true } } } },
        timeRecords: { include: { checkpoint: { select: { type: true } } } },
      },
    });
    if (entries.length === 0) {
      console.log(`⚠️  Aucun inscrit É3 pour ${corr.slug}`);
      continue;
    }
    const teamName = entries[0].rider.team.name;
    const deltaMs = corr.seconds * 1000;

    // Temps brut d'équipe = dernier (Kᵉ) coureur
    const elapsed = entries
      .map((e) => {
        const st = e.timeRecords.find((t) => t.checkpoint.type === "start");
        const fi = e.timeRecords.find((t) => t.checkpoint.type === "finish");
        return st && fi ? fi.timestamp.getTime() - st.timestamp.getTime() : null;
      })
      .filter((x): x is number => x !== null);
    const rawBefore = Math.max(...elapsed);
    const k = elapsed.length;

    console.log(`\n${teamName} — ${corr.reason}`);
    console.log(`   temps brut : ${fmt(rawBefore)}  →  ${fmt(rawBefore - deltaMs)}  (K=${k})`);
    console.log(`   impact général (×${k}) : −${fmt(deltaMs * k)}`);

    if (apply) {
      for (const e of entries) {
        const fi = e.timeRecords.find((t) => t.checkpoint.type === "finish");
        if (!fi) {
          console.log(`   ⚠️  ${e.rider.firstName} : pas de finish, ignoré`);
          continue;
        }
        await prisma.timeRecord.update({
          where: { id: fi.id },
          data: {
            timestamp: new Date(fi.timestamp.getTime() - deltaMs),
            isManual: true,
            correctedBy: corr.reason,
          },
        });
      }
      console.log(`   ✅ appliqué à ${entries.length} coureurs`);
    }
  }

  if (!apply) console.log("\n🔍 DRY-RUN — aucune écriture. Relancer avec --apply.");
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
