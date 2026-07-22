import { prisma } from "../src/lib/db";
import { BLOCK1, B1_TO_FUNFACT } from "../src/features/questionnaire/seed/questionnaire-content.seed";
import { writeFileSync } from "fs";

// Colonnes "portrait" utiles pour les slides de présentation (on exclut
// type_coureur/battre qui ne sont pas des fun facts publics).
const PORTRAIT_KEYS = BLOCK1.filter(
  (q) => q.type === "free" || q.key === "b1_region"
).map((q) => q.key);

function csvEscape(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

async function main() {
  const riders = await prisma.rider.findMany({
    include: {
      team: true,
      user: { include: { questionnaire: { include: { answers: true } } } },
    },
    orderBy: [{ team: { name: "asc" } }, { firstName: "asc" }],
  });

  const headers = ["Nom", "Équipe", ...BLOCK1.filter((q) => PORTRAIT_KEYS.includes(q.key)).map((q) => q.prompt)];

  const rows: string[][] = [];
  for (const rider of riders) {
    const answersByKey = new Map(
      rider.user?.questionnaire?.answers.map((a) => [a.questionKey, a.answerText ?? ""]) ?? []
    );
    // Rider.funFacts is the canonical source (kept in sync from the questionnaire, but
    // also editable directly from "Mon espace > Profil" without ever touching the
    // questionnaire table) — prefer it for the 11 shared keys, fall back to the
    // questionnaire answer for region/objectif secret which have no fun-fact equivalent.
    const funFacts = (rider.funFacts as Record<string, string> | null) ?? {};
    const row = [
      rider.nickname ? `${rider.firstName} "${rider.nickname}"` : rider.firstName,
      rider.team.name,
      ...PORTRAIT_KEYS.map((key) => {
        const ffKey = B1_TO_FUNFACT[key];
        return (ffKey ? funFacts[ffKey] : undefined) ?? answersByKey.get(key) ?? "";
      }),
    ];
    rows.push(row);
  }

  const csv = [headers, ...rows].map((r) => r.map(csvEscape).join(",")).join("\n");
  const outPath = "export-coureurs-portrait-2026-07-12.csv";
  writeFileSync(outPath, csv, "utf-8");
  console.log(`Écrit ${rows.length} lignes dans ${outPath}`);
}

main().finally(() => prisma.$disconnect());
