"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import {
  B1_TO_FUNFACT,
  BLOCK1_BY_KEY,
  BLOCK2_BY_KEY,
  BLOCK3_BY_KEY,
} from "@/features/questionnaire/seed/questionnaire-content.seed";
import {
  QuestionnaireDisabledError,
  QuestionnaireForbiddenError,
  assertQuestionnaireEnabled,
  getOrCreateQuestionnaire,
  requireQuestionnaireUser,
} from "@/features/questionnaire/actions/_shared";

export type SaveAnswerInput = {
  block: number;
  questionKey: string;
  answerText?: string | null;
  answerChoice?: "A" | "B" | null;
};

export type SaveAnswerResult =
  | { ok: true; isCorrect?: boolean | null }
  | { ok: false; error: string };

/**
 * Upsert idempotent d'une réponse sur (questionnaireId, questionKey).
 * Bloc 3 : `isCorrect` est calculé côté serveur — le client ne l'envoie jamais.
 */
export async function saveAnswer(
  input: SaveAnswerInput,
): Promise<SaveAnswerResult> {
  try {
    assertQuestionnaireEnabled();
    const { userId } = await requireQuestionnaireUser();

    const { block, questionKey } = input;

    // Le questionKey doit appartenir au bloc annoncé.
    const belongs =
      (block === 1 && BLOCK1_BY_KEY.has(questionKey)) ||
      (block === 2 && BLOCK2_BY_KEY.has(questionKey)) ||
      (block === 3 && BLOCK3_BY_KEY.has(questionKey));
    if (!belongs) return { ok: false, error: "Question inconnue." };

    const answerText =
      typeof input.answerText === "string"
        ? input.answerText.slice(0, 500)
        : null;
    const answerChoice =
      input.answerChoice === "A" || input.answerChoice === "B"
        ? input.answerChoice
        : null;

    // Bloc 3 : score serveur.
    let isCorrect: boolean | null = null;
    if (block === 3) {
      const q = BLOCK3_BY_KEY.get(questionKey)!;
      if (!answerChoice) return { ok: false, error: "Réponse manquante." };
      isCorrect = answerChoice === q.correct;
    }

    const questionnaire = await getOrCreateQuestionnaire(userId);

    await prisma.questionnaireAnswer.upsert({
      where: {
        questionnaireId_questionKey: {
          questionnaireId: questionnaire.id,
          questionKey,
        },
      },
      create: {
        questionnaireId: questionnaire.id,
        block,
        questionKey,
        answerText,
        answerChoice,
        isCorrect,
      },
      update: { answerText, answerChoice, isCorrect },
    });

    // Bloc 1 : synchronise les questions mappées vers les fun facts du profil.
    if (block === 1 && B1_TO_FUNFACT[questionKey]) {
      await syncFunFact(userId, B1_TO_FUNFACT[questionKey], answerText);
    }

    return { ok: true, isCorrect };
  } catch (err) {
    return mapError(err);
  }
}

/** Écrit la valeur dans Rider.funFacts[ffKey] (ou la retire si vide). */
async function syncFunFact(
  userId: string,
  ffKey: string,
  value: string | null,
): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { riderId: true, rider: { select: { funFacts: true } } },
  });
  if (!user?.riderId) return; // user sans coureur lié (ex: admin) → rien à sync

  const raw = user.rider?.funFacts;
  const ff: Record<string, string> =
    raw && typeof raw === "object" && !Array.isArray(raw)
      ? { ...(raw as Record<string, string>) }
      : {};

  const v = value?.trim();
  if (v) ff[ffKey] = v;
  else delete ff[ffKey];

  await prisma.rider.update({
    where: { id: user.riderId },
    data: { funFacts: ff },
  });
  revalidatePath("/mon-espace");
  revalidatePath("/mon-espace/profil");
}

function mapError(err: unknown): { ok: false; error: string } {
  if (err instanceof QuestionnaireDisabledError)
    return { ok: false, error: "Feature désactivée." };
  if (err instanceof QuestionnaireForbiddenError)
    return { ok: false, error: `Non autorisé (${err.message}).` };
  const detail = err instanceof Error ? err.message : String(err);
  return { ok: false, error: `Erreur: ${detail}` };
}
