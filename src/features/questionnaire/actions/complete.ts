"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import {
  QuestionnaireDisabledError,
  QuestionnaireForbiddenError,
  assertQuestionnaireEnabled,
  getOrCreateQuestionnaire,
  requireQuestionnaireUser,
} from "@/features/questionnaire/actions/_shared";

export type CompleteResult =
  | { ok: true; knowledgeScore: number }
  | { ok: false; error: string };

/**
 * Marque le questionnaire comme complété et fige le score de connaissances
 * (somme des isCorrect du bloc 3, recalculée serveur).
 */
export async function completeQuestionnaire(): Promise<CompleteResult> {
  try {
    assertQuestionnaireEnabled();
    const { userId } = await requireQuestionnaireUser();

    const questionnaire = await getOrCreateQuestionnaire(userId);

    const knowledgeScore = await prisma.questionnaireAnswer.count({
      where: { questionnaireId: questionnaire.id, block: 3, isCorrect: true },
    });

    await prisma.questionnaire.update({
      where: { id: questionnaire.id },
      data: {
        completedAt: questionnaire.completedAt ?? new Date(),
        knowledgeScore,
      },
    });

    revalidatePath("/questionnaire");
    return { ok: true, knowledgeScore };
  } catch (err) {
    if (err instanceof QuestionnaireDisabledError)
      return { ok: false, error: "Feature désactivée." };
    if (err instanceof QuestionnaireForbiddenError)
      return { ok: false, error: `Non autorisé (${err.message}).` };
    const detail = err instanceof Error ? err.message : String(err);
    return { ok: false, error: `Erreur: ${detail}` };
  }
}
