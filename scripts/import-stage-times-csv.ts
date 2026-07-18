/**
 * Porte de sortie « jour sans réseau » : importe les temps d'une étape depuis
 * un CSV (ex : segments Strava) À LA PLACE des mesures GPS de l'app.
 *
 * Usage :
 *   npx tsx scripts/import-stage-times-csv.ts --stage 5 --csv temps.csv          # dry-run (aucune écriture)
 *   npx tsx scripts/import-stage-times-csv.ts --stage 5 --csv temps.csv --apply  # écrit en base
 *
 * Format CSV (séparateur virgule OU point-virgule, 1 ligne d'en-tête) :
 *   coureur,temps
 *   Clément Daguet,49:32
 *   kevin-lorenzo,1:02:11
 *
 * - `coureur` : prénom exact, slug, ou début de prénom si non ambigu
 * - `temps`   : h:mm:ss, mm:ss, ou secondes
 *
 * Comportement :
 * - Import tout-ou-rien : la moindre ligne invalide annule tout (rien d'écrit).
 * - Pour chaque coureur du CSV : inscription créée si absente, statut passé à
 *   « finished », TimeRecords start/finish écrasés (start = départ officiel de
 *   l'étape, finish = départ + temps). Les écarts sont donc exactement ceux du CSV.
 * - Les coureurs ABSENTS du CSV gardent leurs mesures app telles quelles.
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

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseTimeToMs(raw: string): number | null {
  const t = raw.trim();
  if (/^\d+$/.test(t)) return parseInt(t, 10) * 1000; // secondes
  const m = t.match(/^(?:(\d+):)?(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const h = m[1] ? parseInt(m[1], 10) : 0;
  const min = parseInt(m[2], 10);
  const s = parseInt(m[3], 10);
  if (min >= 60 || s >= 60) return null;
  return ((h * 60 + min) * 60 + s) * 1000;
}

function formatMs(ms: number): string {
  const total = Math.round(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

async function main() {
  const args = process.argv.slice(2);
  const getArg = (name: string) => {
    const i = args.indexOf(`--${name}`);
    return i >= 0 ? args[i + 1] : undefined;
  };
  const stageNumber = Number(getArg("stage"));
  const csvPath = getArg("csv");
  const apply = args.includes("--apply");

  if (!stageNumber || !csvPath) {
    console.error(
      "Usage : npx tsx scripts/import-stage-times-csv.ts --stage <n> --csv <fichier> [--apply]"
    );
    process.exit(1);
  }
  if (!fs.existsSync(csvPath)) {
    console.error(`❌ Fichier introuvable : ${csvPath}`);
    process.exit(1);
  }

  const prisma = new PrismaClient();

  const stage = await prisma.stage.findUnique({
    where: { number: stageNumber },
    include: { checkpoints: true },
  });
  if (!stage) throw new Error(`Étape ${stageNumber} introuvable`);

  const startCp = stage.checkpoints.find((c) => c.type === "start");
  const finishCp = stage.checkpoints.find((c) => c.type === "finish");
  if (!startCp || !finishCp) {
    throw new Error(
      `Étape ${stageNumber} : checkpoints start/finish manquants (start=${!!startCp}, finish=${!!finishCp})`
    );
  }

  const riders = await prisma.rider.findMany({
    include: { team: { select: { name: true, slug: true } } },
  });

  // ── Parse + résolution des coureurs (tout-ou-rien) ──
  const content = fs.readFileSync(csvPath, "utf-8").replace(/^﻿/, "");
  const lines = content
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  if (lines.length < 2) throw new Error("CSV vide (en-tête + données attendus)");

  const sep = lines[0].includes(";") ? ";" : ",";
  const rows = lines.slice(1); // saute l'en-tête

  const errors: string[] = [];
  const imports: Array<{
    rider: (typeof riders)[number];
    elapsedMs: number;
    raw: string;
  }> = [];
  const seen = new Set<string>();

  for (const [idx, line] of rows.entries()) {
    const cols = line.split(sep).map((c) => c.trim());
    const lineNo = idx + 2;
    if (cols.length < 2 || !cols[0] || !cols[1]) {
      errors.push(`ligne ${lineNo} : format invalide « ${line} »`);
      continue;
    }
    const [rawName, rawTime] = cols;

    const elapsedMs = parseTimeToMs(rawTime);
    if (elapsedMs === null || elapsedMs <= 0) {
      errors.push(`ligne ${lineNo} : temps illisible « ${rawTime} » (attendu h:mm:ss, mm:ss ou secondes)`);
      continue;
    }

    const needle = normalize(rawName);
    let matches = riders.filter(
      (r) => normalize(r.firstName) === needle || normalize(r.slug) === needle
    );
    if (matches.length === 0) {
      matches = riders.filter((r) => normalize(r.firstName).startsWith(needle));
    }
    if (matches.length === 0) {
      errors.push(`ligne ${lineNo} : coureur introuvable « ${rawName} »`);
      continue;
    }
    if (matches.length > 1) {
      errors.push(
        `ligne ${lineNo} : « ${rawName} » ambigu (${matches.map((m) => m.firstName).join(" / ")})`
      );
      continue;
    }
    const rider = matches[0];
    if (seen.has(rider.id)) {
      errors.push(`ligne ${lineNo} : ${rider.firstName} apparaît deux fois`);
      continue;
    }
    seen.add(rider.id);
    imports.push({ rider, elapsedMs, raw: rawTime });
  }

  if (errors.length > 0) {
    console.error(`\n❌ ${errors.length} erreur(s) — RIEN n'a été écrit :\n`);
    for (const e of errors) console.error(`   • ${e}`);
    await prisma.$disconnect();
    process.exit(1);
  }

  // ── Aperçu ──
  imports.sort((a, b) => a.elapsedMs - b.elapsedMs);
  console.log(
    `\nÉ${stage.number} — ${stage.name}\n${imports.length} temps à importer (start = ${
      (stage.startTime ?? stage.date).toISOString()
    }) :\n`
  );
  const winner = imports[0].elapsedMs;
  for (const [i, imp] of imports.entries()) {
    const gap = imp.elapsedMs === winner ? "—" : `+${formatMs(imp.elapsedMs - winner)}`;
    console.log(
      `   ${String(i + 1).padStart(2)}. ${imp.rider.firstName.padEnd(24)} [${imp.rider.team.name.padEnd(22)}] ${formatMs(imp.elapsedMs)}  ${gap}`
    );
  }

  const riderIdsInCsv = new Set(imports.map((i) => i.rider.id));
  const existingEntries = await prisma.stageEntry.findMany({
    where: { stageId: stage.id },
    include: { rider: { select: { id: true, firstName: true } } },
  });
  const notInCsv = existingEntries.filter((e) => !riderIdsInCsv.has(e.rider.id));
  if (notInCsv.length > 0) {
    console.log(
      `\nℹ️  Inscrits absents du CSV (gardent leurs mesures app) : ${notInCsv
        .map((e) => e.rider.firstName)
        .join(" · ")}`
    );
  }

  if (!apply) {
    console.log("\n🔍 DRY-RUN — aucune écriture. Relancer avec --apply pour importer.");
    await prisma.$disconnect();
    return;
  }

  // ── Écriture ──
  const baseTime = stage.startTime ?? stage.date;
  for (const imp of imports) {
    const entry = await prisma.stageEntry.upsert({
      where: { riderId_stageId: { riderId: imp.rider.id, stageId: stage.id } },
      create: { riderId: imp.rider.id, stageId: stage.id, status: "finished" },
      update: { status: "finished" },
    });
    for (const [cp, ts] of [
      [startCp, baseTime],
      [finishCp, new Date(baseTime.getTime() + imp.elapsedMs)],
    ] as const) {
      await prisma.timeRecord.upsert({
        where: { entryId_checkpointId: { entryId: entry.id, checkpointId: cp.id } },
        create: {
          entryId: entry.id,
          checkpointId: cp.id,
          timestamp: ts,
          isManual: true,
          correctedBy: "import-csv",
        },
        update: { timestamp: ts, isManual: true, correctedBy: "import-csv" },
      });
    }
    console.log(`✅ ${imp.rider.firstName} : ${formatMs(imp.elapsedMs)}`);
  }

  console.log(
    `\n🎉 ${imports.length} temps importés sur É${stage.number}.` +
      `\n   Penser à valider l'étape (statut « finished ») pour qu'elle compte aux classements.`
  );

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
