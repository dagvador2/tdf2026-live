/**
 * Efface le questionnaire d'un utilisateur (ses réponses + ses parrainages).
 * La cascade Prisma supprime QuestionnaireAnswer, SponsorBlock et SponsorFact.
 * Les faits écrits par d'AUTRES sur cet utilisateur ne sont PAS touchés.
 *
 *   npx tsx scripts/erase-questionnaire.ts <email>
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const email = process.argv[2];
  if (!email) {
    console.error("Usage: npx tsx scripts/erase-questionnaire.ts <email>");
    process.exit(1);
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true },
  });
  if (!user) {
    console.error(`Aucun utilisateur avec l'email ${email}`);
    process.exit(1);
  }

  const q = await prisma.questionnaire.findUnique({
    where: { userId: user.id },
    select: {
      id: true,
      completedAt: true,
      knowledgeScore: true,
      _count: { select: { answers: true, sponsorings: true } },
    },
  });

  if (!q) {
    console.log(`Pas de questionnaire pour ${email} — rien à effacer.`);
    return;
  }

  console.log(`Questionnaire de ${email} :`);
  console.log(`  - réponses (blocs 1-3) : ${q._count.answers}`);
  console.log(`  - parrainages          : ${q._count.sponsorings}`);
  console.log(`  - complété             : ${q.completedAt ? "oui" : "non"}`);
  console.log(`  - score                : ${q.knowledgeScore ?? "—"}`);

  await prisma.questionnaire.delete({ where: { id: q.id } });
  console.log("\n✅ Questionnaire effacé (cascade : réponses, parrainages, faits).");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
