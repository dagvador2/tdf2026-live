import { prisma } from "../src/lib/db";
import { FUN_FACT_FIELDS } from "../src/lib/utils/constants";
import { B1_TO_FUNFACT } from "../src/features/questionnaire/seed/questionnaire-content.seed";

const FUNFACT_TO_B1 = Object.fromEntries(
  Object.entries(B1_TO_FUNFACT).map(([b1Key, ffKey]) => [ffKey, b1Key])
);

async function main() {
  const riders = await prisma.rider.findMany({
    include: { user: { include: { questionnaire: { include: { answers: true } } } } },
  });

  const rows: { name: string; funFactsCount: number; viaProfileOnly: number }[] = [];

  for (const r of riders) {
    const funFacts = (r.funFacts as Record<string, string> | null) ?? {};
    const filledKeys = FUN_FACT_FIELDS.filter((f) => funFacts[f.key]?.trim()).map((f) => f.key);

    const answersByKey = new Map(
      r.user?.questionnaire?.answers.map((a) => [a.questionKey, a.answerText]) ?? []
    );
    // Fun facts present in Rider.funFacts but with no matching questionnaire answer
    // (filled via "Mon espace > Profil" directly, never synced to the questionnaire)
    const viaProfileOnly = filledKeys.filter((ffKey) => {
      const b1Key = FUNFACT_TO_B1[ffKey];
      return !answersByKey.get(b1Key)?.trim();
    }).length;

    rows.push({
      name: r.nickname ? `${r.firstName} "${r.nickname}"` : r.firstName,
      funFactsCount: filledKeys.length,
      viaProfileOnly,
    });
  }

  rows.sort((a, b) => a.funFactsCount - b.funFactsCount);
  for (const row of rows) {
    console.log(
      `${row.funFactsCount}/${FUN_FACT_FIELDS.length} — ${row.name}${row.viaProfileOnly > 0 ? `  (dont ${row.viaProfileOnly} via profil hors questionnaire)` : ""}`
    );
  }
}

main().finally(() => prisma.$disconnect());
