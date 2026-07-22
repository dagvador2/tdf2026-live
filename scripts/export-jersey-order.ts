/**
 * Génère un .xlsx de commande de maillots avec coupe Homme / Femme distincte :
 *   - Onglet "Récap Hommes" : équipe × taille (coupe H)
 *   - Onglet "Récap Femmes" : équipe × taille (coupe F)
 *   - Onglet "Récap global" : tous genres confondus
 *   - Onglet "Détail" : chaque maillot avec coureur, équipe, taille, genre, note
 *
 * Applique :
 *   - Swap manuel : Ronan Thomas → 1 maillot RedBull au lieu de son Visma Ricard d'équipe
 *     (et on ignore son extra RedBull car le swap couvre déjà sa demande)
 *   - Override manuel : Antoine Bailly garde son RedBull L additionnel (retiré du profil par erreur)
 *   - Ajout externe : +1 Des Glaçons CMA CGM taille S (coupe F)
 *   - Stock non attribué : 15 maillots (5 EAU 3M/1L/1S, 4 RedBull 3M/1L, 3 Glaçons M, 3 Visma M) — coupe H
 *
 * Coureuses identifiées (coupe F) : Ambre, Nadège, Lucie, Gaëlle, Louise, Coco, Ève (7 femmes / 28 coureurs).
 *
 * Usage : DATABASE_URL=... npx tsx scripts/export-jersey-order.ts
 */
import { PrismaClient } from "@prisma/client";
import ExcelJS from "exceljs";
import { resolve } from "path";

const prisma = new PrismaClient();

const SLUGS = {
  EAU: "eau-pastis-xrg",
  REDBULL: "redbull-vodka-hangover",
  GLACONS: "des-glacons-cma-cgm",
  VISMA: "visma-ricard",
} as const;

const SIZES = ["XS", "S", "M", "L", "XL", "XXL"] as const;

// Coureuses (matching insensible aux accents/casse, sur le début du firstName)
const WOMEN_NORMALIZED = new Set([
  "ambre",
  "nadege",
  "lucie",
  "gaelle",
  "louise",
  "coco",
  "eve",
]);

type Gender = "H" | "F";

function normalize(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function genderOfRider(firstName: string): Gender {
  const n = normalize(firstName);
  for (const w of WOMEN_NORMALIZED) {
    if (n === w || n.startsWith(w + " ") || n.startsWith(w + "-")) return "F";
  }
  return "H";
}

interface OrderLine {
  source: string;
  team: string;
  size: string;
  gender: Gender;
  qty: number;
  note?: string;
}

async function main() {
  const teams = await prisma.team.findMany({
    where: { slug: { not: "sans-equipe" } },
    orderBy: { name: "asc" },
  });
  const teamBySlug = new Map(teams.map((t) => [t.slug, t]));

  const riders = await prisma.rider.findMany({
    where: { team: { slug: { not: "sans-equipe" } } },
    orderBy: [{ team: { name: "asc" } }, { firstName: "asc" }],
    include: { team: true },
  });

  const lines: OrderLine[] = [];
  const missingSizes: string[] = [];

  for (const r of riders) {
    if (!r.jerseySize) {
      missingSizes.push(`${r.firstName} (${r.team.name})`);
      continue;
    }
    const size = r.jerseySize;
    const gender = genderOfRider(r.firstName);

    // Swap manuel pour Ronan Thomas
    const isRonan = r.firstName.toLowerCase().includes("ronan");
    if (isRonan) {
      lines.push({
        source: `Coureur: ${r.firstName}`,
        team: teamBySlug.get(SLUGS.REDBULL)!.name,
        size,
        gender,
        qty: 1,
        note: "Swap : prend RedBull au lieu de son Visma Ricard d'équipe",
      });
    } else {
      lines.push({
        source: `Coureur: ${r.firstName}`,
        team: r.team.name,
        size,
        gender,
        qty: 1,
        note: "Maillot d'équipe",
      });
    }

    // Pour Ronan : on ignore son extra RedBull car le swap couvre déjà sa demande
    if (!isRonan) {
      const extras = (r.extraJerseys as Record<string, number> | null) ?? {};
      for (const [slug, qty] of Object.entries(extras)) {
        if (qty <= 0) continue;
        const t = teamBySlug.get(slug);
        if (!t) continue;
        lines.push({
          source: `Coureur: ${r.firstName}`,
          team: t.name,
          size,
          gender,
          qty,
          note: "Maillot additionnel",
        });
      }
    }

    // Override manuel : Antoine Bailly garde son RedBull L (retiré du profil par erreur)
    if (r.firstName.toLowerCase().includes("antoine bailly")) {
      lines.push({
        source: `Coureur: ${r.firstName}`,
        team: teamBySlug.get(SLUGS.REDBULL)!.name,
        size,
        gender,
        qty: 1,
        note: "Maillot additionnel (override : retiré du profil par erreur)",
      });
    }
  }

  // ── Externe : 1 Des Glaçons S — coupe F ─────────────────────────────────
  lines.push({
    source: "Externe",
    team: teamBySlug.get(SLUGS.GLACONS)!.name,
    size: "S",
    gender: "F",
    qty: 1,
    note: "Personne externe",
  });

  // ── Stock non attribué : coupe H ────────────────────────────────────────
  const stockNote = "Stock non attribué";
  // 5 EAU Pastis : 3M, 1L, 1S
  lines.push({ source: "Stock", team: teamBySlug.get(SLUGS.EAU)!.name, size: "M", gender: "H", qty: 3, note: stockNote });
  lines.push({ source: "Stock", team: teamBySlug.get(SLUGS.EAU)!.name, size: "L", gender: "H", qty: 1, note: stockNote });
  lines.push({ source: "Stock", team: teamBySlug.get(SLUGS.EAU)!.name, size: "S", gender: "H", qty: 1, note: stockNote });
  // 4 RedBull : 3M, 1L
  lines.push({ source: "Stock", team: teamBySlug.get(SLUGS.REDBULL)!.name, size: "M", gender: "H", qty: 3, note: stockNote });
  lines.push({ source: "Stock", team: teamBySlug.get(SLUGS.REDBULL)!.name, size: "L", gender: "H", qty: 1, note: stockNote });
  // 3 Glaçons M
  lines.push({ source: "Stock", team: teamBySlug.get(SLUGS.GLACONS)!.name, size: "M", gender: "H", qty: 3, note: stockNote });
  // 3 Visma M
  lines.push({ source: "Stock", team: teamBySlug.get(SLUGS.VISMA)!.name, size: "M", gender: "H", qty: 3, note: stockNote });

  // ── Comptage par genre ──────────────────────────────────────────────────
  type Counts = Record<string, Record<string, number>>;
  const countsByGender: Record<Gender, Counts> = { H: {}, F: {} };
  const countsAll: Counts = {};
  for (const t of teams) {
    countsByGender.H[t.name] = {};
    countsByGender.F[t.name] = {};
    countsAll[t.name] = {};
  }
  for (const line of lines) {
    countsByGender[line.gender][line.team][line.size] =
      (countsByGender[line.gender][line.team][line.size] ?? 0) + line.qty;
    countsAll[line.team][line.size] = (countsAll[line.team][line.size] ?? 0) + line.qty;
  }

  const total = (c: Counts) =>
    Object.values(c).reduce(
      (sum, row) => sum + Object.values(row).reduce((s, n) => s + n, 0),
      0
    );
  const totalH = total(countsByGender.H);
  const totalF = total(countsByGender.F);
  const grandTotal = totalH + totalF;

  // ── Excel ───────────────────────────────────────────────────────────────
  const wb = new ExcelJS.Workbook();
  wb.creator = "TDF 2026 Live Tracker";
  wb.created = new Date();

  // Helper : ajoute un onglet récap équipe × taille pour un set de Counts
  function addRecapSheet(name: string, counts: Counts, titleColor: string) {
    const ws = wb.addWorksheet(name);
    ws.columns = [
      { header: "Équipe", key: "team", width: 28 },
      ...SIZES.map((s) => ({ header: s, key: s, width: 8 })),
      { header: "Total", key: "total", width: 10 },
    ];
    const headerRow = ws.getRow(1);
    headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
    headerRow.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: titleColor },
    };
    for (const t of teams) {
      const row: Record<string, string | number> = { team: t.name };
      let rowTotal = 0;
      for (const s of SIZES) {
        const n = counts[t.name][s] ?? 0;
        row[s] = n || "";
        rowTotal += n;
      }
      row.total = rowTotal;
      ws.addRow(row);
    }
    const totalRow: Record<string, string | number> = { team: "TOTAL" };
    let grand = 0;
    for (const s of SIZES) {
      const sum = teams.reduce((acc, t) => acc + (counts[t.name][s] ?? 0), 0);
      totalRow[s] = sum;
      grand += sum;
    }
    totalRow.total = grand;
    const tRow = ws.addRow(totalRow);
    tRow.font = { bold: true };
    tRow.eachCell((cell) => {
      cell.border = { top: { style: "thin" } };
    });
  }

  addRecapSheet("Récap Femmes", countsByGender.F, "FFB91D47");  // rose foncé
  addRecapSheet("Récap Hommes", countsByGender.H, "FF1F3A8A");  // bleu foncé
  addRecapSheet("Récap global", countsAll, "FF374151");          // gris

  // ── Onglet Détail ───────────────────────────────────────────────────────
  const detail = wb.addWorksheet("Détail");
  detail.columns = [
    { header: "Source", key: "source", width: 32 },
    { header: "Équipe", key: "team", width: 28 },
    { header: "Taille", key: "size", width: 8 },
    { header: "Coupe", key: "gender", width: 8 },
    { header: "Quantité", key: "qty", width: 10 },
    { header: "Note", key: "note", width: 50 },
  ];
  detail.getRow(1).font = { bold: true };
  // Tri : Femmes d'abord (mises en avant), puis Hommes
  const sorted = [...lines].sort((a, b) => {
    if (a.gender !== b.gender) return a.gender === "F" ? -1 : 1;
    if (a.team !== b.team) return a.team.localeCompare(b.team);
    return a.size.localeCompare(b.size);
  });
  for (const line of sorted) {
    const row = detail.addRow(line);
    if (line.gender === "F") {
      // Mise en avant des maillots féminins
      row.eachCell((cell) => {
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFFCE7F3" }, // rose clair
        };
      });
    }
  }
  const detailTotal = detail.addRow({
    source: "TOTAL",
    team: "",
    size: "",
    gender: "",
    qty: grandTotal,
    note: "",
  });
  detailTotal.font = { bold: true };
  detailTotal.eachCell((cell) => {
    cell.border = { top: { style: "thin" } };
  });

  if (missingSizes.length > 0) {
    const ws = wb.addWorksheet("Manques");
    ws.columns = [{ header: "Coureurs sans taille", key: "name", width: 40 }];
    ws.getRow(1).font = { bold: true };
    for (const name of missingSizes) ws.addRow({ name });
  }

  const outPath = resolve(
    __dirname,
    `../commande-maillots-${new Date().toISOString().slice(0, 10)}.xlsx`
  );
  await wb.xlsx.writeFile(outPath);

  console.log(`\n✓ Fichier généré : ${outPath}\n`);

  // Log console
  const print = (label: string, counts: Counts) => {
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log(label);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log(`${"Équipe".padEnd(28)}  ${SIZES.map((s) => s.padStart(4)).join("  ")}   Tot`);
    for (const t of teams) {
      const cells = SIZES.map((s) => String(counts[t.name][s] ?? "").padStart(4));
      const rowTotal = SIZES.reduce((sum, s) => sum + (counts[t.name][s] ?? 0), 0);
      console.log(`${t.name.padEnd(28)}  ${cells.join("  ")}   ${String(rowTotal).padStart(3)}`);
    }
    console.log("───────────────────────────────────────────────────");
    const totals = SIZES.map((s) =>
      teams.reduce((sum, t) => sum + (counts[t.name][s] ?? 0), 0)
    );
    const grand = totals.reduce((s, n) => s + n, 0);
    console.log(`${"TOTAL".padEnd(28)}  ${totals.map((n) => String(n).padStart(4)).join("  ")}   ${String(grand).padStart(3)}`);
    console.log();
  };

  print("RÉCAP FEMMES (coupe F)", countsByGender.F);
  print("RÉCAP HOMMES (coupe H)", countsByGender.H);
  print("RÉCAP GLOBAL", countsAll);

  console.log(`Total Femmes : ${totalF}  ·  Total Hommes : ${totalH}  ·  Grand total : ${grandTotal}\n`);
  if (missingSizes.length > 0) {
    console.log(`⚠ ${missingSizes.length} coureur(s) sans taille : ${missingSizes.join(", ")}\n`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
