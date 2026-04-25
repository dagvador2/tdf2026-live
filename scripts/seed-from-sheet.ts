/**
 * Seed des donnees coureur depuis le Google Sheet (export CSV).
 *
 * Source : scripts/tdf-sheet.csv (export de la feuille "Tour de France 2026 - Présence")
 * Met a jour pour chaque coureur :
 *   - weightKg, ftpWatts, jerseySize
 *   - StageEntry (etapes 1-6) selon les colonnes 20/07 a 25/07
 *
 * NE TOUCHE PAS au champ "team" (le sheet contient du texte libre, pas les
 * 4 equipes officielles).
 *
 * Usage :
 *   npx tsx scripts/seed-from-sheet.ts             # dry-run
 *   npx tsx scripts/seed-from-sheet.ts --apply     # applique
 */
import { PrismaClient } from "@prisma/client";
import { readFileSync } from "fs";
import { join } from "path";

const prisma = new PrismaClient();

const APPLY = process.argv.includes("--apply");
const CSV_PATH = join(__dirname, "tdf-sheet.csv");

// Dates (DD/MM) → numero d'etape attendu en DB (Stage.number)
const DATE_TO_STAGE_NUMBER: Record<string, number> = {
  "20/07": 1,
  "21/07": 2,
  "22/07": 3,
  "23/07": 4,
  "24/07": 5,
  "25/07": 6,
};

const ALLOWED_JERSEY_SIZES = ["XS", "S", "M", "L", "XL", "XXL"] as const;
type JerseySize = (typeof ALLOWED_JERSEY_SIZES)[number];

// Parse une ligne CSV en respectant les guillemets (un seul niveau de quoting)
function parseCsvLine(line: string): string[] {
  const cells: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (c === "," && !inQuotes) {
      cells.push(cur);
      cur = "";
      continue;
    }
    cur += c;
  }
  cells.push(cur);
  return cells;
}

function parseFloatFr(s: string): number | null {
  const trimmed = s.trim();
  if (trimmed === "" || trimmed === "#DIV/0!") return null;
  const normalized = trimmed.replace(",", ".");
  const n = parseFloat(normalized);
  return Number.isFinite(n) ? n : null;
}

function parseIntFr(s: string): number | null {
  const n = parseFloatFr(s);
  if (n == null) return null;
  return Math.round(n);
}

function normalizeJerseySize(raw: string): JerseySize | null {
  const s = raw.trim();
  if (s === "") return null;
  // Cas particuliers connus
  const upper = s.toUpperCase();
  if (upper.includes("XXL")) return "XXL";
  if (upper.includes("XL")) return "XL";
  if (upper.includes("XS")) return "XS";
  // Fallback : prendre les caracteres alphabetiques en uppercase et matcher
  const stripped = upper.replace(/[^A-Z]/g, "");
  if (stripped === "S") return "S";
  if (stripped === "M") return "M";
  if (stripped === "L") return "L";
  // Cas "Si c'est unisexe XS", "Enfant (XS)" → deja captures par includes("XS")
  // Si on arrive la, c'est du texte non reconnu
  return null;
}

function firstWord(name: string): string {
  return name.trim().split(/\s+/)[0]?.trim() ?? "";
}

interface SheetRow {
  rawName: string;
  weightKg: number | null;
  ftpWatts: number | null;
  jerseySize: JerseySize | null;
  jerseySizeRaw: string;
  // Map stageNumber → 1 (registered) | 0 (not registered) | null (blank, skip)
  stageStatus: Map<number, 0 | 1>;
}

async function main() {
  console.log(APPLY ? "🚀 MODE APPLY" : "🔍 MODE DRY-RUN (use --apply to persist)");
  console.log("");

  // 1. Lire CSV
  const raw = readFileSync(CSV_PATH, "utf8");
  const lines = raw.split(/\r?\n/);

  // Le header est sur les lignes 0-2, les data commencent ligne 4 (ligne 3 est vide)
  // Ligne 2 contient les dates : on les utilise pour mapper les colonnes
  const datesLine = parseCsvLine(lines[2] ?? "");
  const colToStageNumber = new Map<number, number>();
  for (let i = 0; i < datesLine.length; i++) {
    const dateStr = datesLine[i].trim().split(" ")[0]; // au cas ou il y a du texte apres
    const stageNum = DATE_TO_STAGE_NUMBER[dateStr];
    if (stageNum !== undefined) {
      colToStageNumber.set(i, stageNum);
    }
  }
  console.log(
    `📅 Colonnes etapes detectees : ${[...colToStageNumber.entries()]
      .map(([col, num]) => `col ${col} → etape ${num}`)
      .join(", ")}`
  );
  if (colToStageNumber.size !== 6) {
    throw new Error(
      `Attendu 6 etapes (1-6), trouve ${colToStageNumber.size}. Verifie le CSV.`
    );
  }
  console.log("");

  // 2. Indexer les colonnes meta a partir de la ligne 0 (header principal)
  const headerLine = parseCsvLine(lines[0] ?? "");
  const findCol = (label: string): number => {
    const idx = headerLine.findIndex((h) =>
      h.trim().toLowerCase().startsWith(label.toLowerCase())
    );
    return idx;
  };
  const colFtp = findCol("FTP");
  const colWeight = findCol("Poids");
  const colJersey = findCol("Taille Maillot");
  console.log(
    `📋 Colonnes meta : FTP=${colFtp} Poids=${colWeight} Maillot=${colJersey}`
  );
  console.log("");

  // 3. Parser les lignes data
  const rows: SheetRow[] = [];
  for (let i = 4; i < lines.length; i++) {
    const cells = parseCsvLine(lines[i]);
    const name = (cells[0] ?? "").trim();
    if (!name) continue;
    // Skip ligne de totaux (commence par "" + "" + nombre)
    if (firstWord(name).match(/^\d+$/)) continue;

    const stageStatus = new Map<number, 0 | 1>();
    for (const [col, stageNum] of colToStageNumber.entries()) {
      const v = (cells[col] ?? "").trim();
      if (v === "1") stageStatus.set(stageNum, 1);
      else if (v === "0") stageStatus.set(stageNum, 0);
      // 0.5, ?, blank → skip (laisse l'etat actuel)
    }

    rows.push({
      rawName: name,
      weightKg: parseFloatFr(cells[colWeight] ?? ""),
      ftpWatts: parseIntFr(cells[colFtp] ?? ""),
      jerseySize: normalizeJerseySize(cells[colJersey] ?? ""),
      jerseySizeRaw: (cells[colJersey] ?? "").trim(),
      stageStatus,
    });
  }
  console.log(`📊 ${rows.length} lignes coureur lues depuis le CSV`);
  console.log("");

  // 4. Charger riders + stages depuis la DB
  const riders = await prisma.rider.findMany({
    select: { id: true, firstName: true, weightKg: true, ftpWatts: true, jerseySize: true },
  });
  const stages = await prisma.stage.findMany({
    select: { id: true, number: true },
  });
  const stageNumberToId = new Map<number, string>(
    stages.map((s) => [s.number, s.id])
  );
  for (const num of Object.values(DATE_TO_STAGE_NUMBER)) {
    if (!stageNumberToId.has(num)) {
      throw new Error(`Etape ${num} introuvable en DB`);
    }
  }

  // 5. Index riders : full-name (lowercase, normalise) + premier mot (lowercase)
  const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");
  const ridersByFullName = new Map<string, (typeof riders)[number]>();
  const ridersByFirstWord = new Map<string, typeof riders>();
  for (const r of riders) {
    ridersByFullName.set(norm(r.firstName), r);
    const key = firstWord(r.firstName).toLowerCase();
    const arr = ridersByFirstWord.get(key) ?? [];
    arr.push(r);
    ridersByFirstWord.set(key, arr);
  }

  // 6. Pour chaque ligne, matcher et appliquer
  const unmatched: string[] = [];
  const ambiguous: string[] = [];
  let updateCount = 0;
  let stageEntryAddCount = 0;
  let stageEntryRemoveCount = 0;
  let metaSkippedCount = 0;

  for (const row of rows) {
    // 1. Match exact sur le nom complet
    let rider: (typeof riders)[number] | null = ridersByFullName.get(norm(row.rawName)) ?? null;
    // 2. Sinon match sur le premier mot, si non ambigu
    if (!rider) {
      const key = firstWord(row.rawName).toLowerCase();
      const candidates = ridersByFirstWord.get(key) ?? [];
      if (candidates.length === 0) {
        unmatched.push(row.rawName);
        continue;
      }
      if (candidates.length > 1) {
        ambiguous.push(`${row.rawName} → ${candidates.map((c) => c.firstName).join(" / ")}`);
        continue;
      }
      rider = candidates[0];
    }

    // Update meta (weight/FTP/jersey)
    const data: { weightKg?: number; ftpWatts?: number; jerseySize?: string } = {};
    if (row.weightKg != null && row.weightKg !== rider.weightKg) {
      data.weightKg = row.weightKg;
    }
    if (row.ftpWatts != null && row.ftpWatts !== rider.ftpWatts) {
      data.ftpWatts = row.ftpWatts;
    }
    if (row.jerseySize != null && row.jerseySize !== rider.jerseySize) {
      data.jerseySize = row.jerseySize;
    }
    if (row.jerseySizeRaw && row.jerseySize == null) {
      console.log(
        `  ⚠️  Maillot non reconnu pour ${rider.firstName} : "${row.jerseySizeRaw}" → ignore`
      );
    }
    if (Object.keys(data).length > 0) {
      console.log(`  📝 ${rider.firstName} : ${JSON.stringify(data)}`);
      updateCount++;
      if (APPLY) {
        await prisma.rider.update({ where: { id: rider.id }, data });
      }
    } else {
      metaSkippedCount++;
    }

    // Stage entries
    for (const [stageNum, status] of row.stageStatus.entries()) {
      const stageId = stageNumberToId.get(stageNum)!;
      const existing = await prisma.stageEntry.findFirst({
        where: { riderId: rider.id, stageId },
        select: { id: true },
      });
      if (status === 1 && !existing) {
        console.log(`  ➕ ${rider.firstName} inscrit a etape ${stageNum}`);
        stageEntryAddCount++;
        if (APPLY) {
          await prisma.stageEntry.create({
            data: { riderId: rider.id, stageId },
          });
        }
      } else if (status === 0 && existing) {
        console.log(`  ➖ ${rider.firstName} desinscrit de etape ${stageNum}`);
        stageEntryRemoveCount++;
        if (APPLY) {
          // Supprimer en cascade les donnees liees (devrait etre vide pour des etapes futures)
          await prisma.gpsPosition.deleteMany({
            where: { entryId: existing.id },
          });
          await prisma.timeRecord.deleteMany({
            where: { entryId: existing.id },
          });
          await prisma.stageEntry.delete({ where: { id: existing.id } });
        }
      }
    }
  }

  console.log("");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`✅ ${updateCount} coureurs mis a jour (meta)`);
  console.log(`📌 ${metaSkippedCount} coureurs sans changement meta`);
  console.log(`➕ ${stageEntryAddCount} inscriptions a creer`);
  console.log(`➖ ${stageEntryRemoveCount} inscriptions a supprimer`);
  console.log("");
  if (unmatched.length > 0) {
    console.log(`❌ ${unmatched.length} coureurs du sheet sans match en DB :`);
    unmatched.forEach((n) => console.log(`   - ${n}`));
  }
  if (ambiguous.length > 0) {
    console.log(`⚠️  ${ambiguous.length} coureurs ambigus :`);
    ambiguous.forEach((n) => console.log(`   - ${n}`));
  }
  console.log("");
  console.log(APPLY ? "✅ Applique." : "🔍 Dry-run termine. Lance avec --apply pour persister.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
