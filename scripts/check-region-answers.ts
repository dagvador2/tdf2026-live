import { prisma } from "../src/lib/db";

async function main() {
  const totalRiders = await prisma.rider.count();

  const totalQuestionnaires = await prisma.questionnaire.count();
  const completed = await prisma.questionnaire.count({ where: { completedAt: { not: null } } });

  const withRegion = await prisma.questionnaireAnswer.count({
    where: { questionKey: "b1_region", answerText: { not: null } },
  });

  const missingRegion = await prisma.questionnaire.findMany({
    where: {
      answers: { none: { questionKey: "b1_region" } },
    },
    include: { user: { select: { name: true, email: true } } },
  });

  const notStarted = await prisma.user.findMany({
    where: { questionnaire: null },
    select: { name: true, email: true, role: true },
  });

  console.log("Total riders:", totalRiders);
  console.log("Questionnaires démarrés:", totalQuestionnaires);
  console.log("Questionnaires complétés:", completed);
  console.log("Réponses avec région d'origine remplie:", withRegion);
  console.log("\n--- Ont démarré/complété le questionnaire MAIS pas de région ---");
  missingRegion.forEach((q) => console.log(`- ${q.user.name} (${q.user.email})`));

  console.log("\n--- N'ont pas du tout de questionnaire (users) ---");
  notStarted.forEach((u) => console.log(`- ${u.name} (${u.email}) [${u.role}]`));
}

main().finally(() => prisma.$disconnect());
