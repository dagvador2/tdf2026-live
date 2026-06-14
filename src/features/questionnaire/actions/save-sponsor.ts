"use server";

import { prisma } from "@/lib/db";
import { BLOCK4_FACT_QUESTIONS } from "@/features/questionnaire/seed/questionnaire-content.seed";
import { getParticipants } from "@/features/questionnaire/lib/data";
import {
  QuestionnaireDisabledError,
  QuestionnaireForbiddenError,
  assertQuestionnaireEnabled,
  getOrCreateQuestionnaire,
  requireQuestionnaireUser,
} from "@/features/questionnaire/actions/_shared";

const FACT_KEYS = new Set(BLOCK4_FACT_QUESTIONS.map((q) => q.key as string));

export type ActionResult = { ok: true } | { ok: false; error: string };

/**
 * Enregistre la sélection de parrainage (1 à 4 personnes, soi exclu).
 * Synchronise les SponsorBlocks : crée les manquants, supprime les retirés.
 */
export async function saveSponsorTargets(
  targetUserIds: string[],
): Promise<ActionResult> {
  try {
    assertQuestionnaireEnabled();
    const { userId } = await requireQuestionnaireUser();

    const unique = Array.from(new Set(targetUserIds)).filter(
      (id) => id !== userId,
    );
    if (unique.length < 1 || unique.length > 4)
      return { ok: false, error: "Choisis entre 1 et 4 personnes." };

    const valid = new Set(
      (await getParticipants(userId)).map((p) => p.userId),
    );
    if (!unique.every((id) => valid.has(id)))
      return { ok: false, error: "Participant invalide." };

    const questionnaire = await getOrCreateQuestionnaire(userId);

    // Non destructif : on crée seulement les blocs sélectionnés. On ne supprime
    // PAS les autres (anecdotes ajoutées ailleurs / plus tard préservées).
    await prisma.$transaction(
      unique.map((targetUserId) =>
        prisma.sponsorBlock.upsert({
          where: {
            questionnaireId_targetUserId: {
              questionnaireId: questionnaire.id,
              targetUserId,
            },
          },
          create: { questionnaireId: questionnaire.id, targetUserId },
          update: {},
        }),
      ),
    );

    return { ok: true };
  } catch (err) {
    return mapError(err);
  }
}

export type SaveSponsorFactInput = {
  targetUserId: string;
  questionKey: string;
  answerText: string | null;
};

/**
 * Upsert d'un fait sur une personne parrainée. Crée le SponsorBlock si absent.
 */
export async function saveSponsorFact(
  input: SaveSponsorFactInput,
): Promise<ActionResult> {
  try {
    assertQuestionnaireEnabled();
    const { userId } = await requireQuestionnaireUser();

    const { targetUserId, questionKey } = input;
    if (targetUserId === userId)
      return { ok: false, error: "Tu ne peux pas te parrainer toi-même." };
    if (!FACT_KEYS.has(questionKey))
      return { ok: false, error: "Question inconnue." };

    const answerText =
      typeof input.answerText === "string"
        ? input.answerText.slice(0, 500)
        : null;

    const questionnaire = await getOrCreateQuestionnaire(userId);

    const block = await prisma.sponsorBlock.upsert({
      where: {
        questionnaireId_targetUserId: {
          questionnaireId: questionnaire.id,
          targetUserId,
        },
      },
      create: { questionnaireId: questionnaire.id, targetUserId },
      update: {},
    });

    await prisma.sponsorFact.upsert({
      where: {
        sponsorBlockId_questionKey: {
          sponsorBlockId: block.id,
          questionKey,
        },
      },
      create: { sponsorBlockId: block.id, questionKey, answerText },
      update: { answerText },
    });

    return { ok: true };
  } catch (err) {
    return mapError(err);
  }
}

/**
 * Sauvegarde fiable de TOUS les faits d'une personne d'un coup (à la sortie de
 * sa fiche). Upsert les champs remplis, supprime les vidés — en une transaction.
 * Plus robuste que les saves par champ au blur (qui pouvaient se perdre).
 */
export async function saveSponsorFacts(
  targetUserId: string,
  factsByKey: Record<string, string>,
): Promise<ActionResult> {
  try {
    assertQuestionnaireEnabled();
    const { userId } = await requireQuestionnaireUser();

    if (targetUserId === userId)
      return { ok: false, error: "Tu ne peux pas te parrainer toi-même." };

    const questionnaire = await getOrCreateQuestionnaire(userId);

    const block = await prisma.sponsorBlock.upsert({
      where: {
        questionnaireId_targetUserId: {
          questionnaireId: questionnaire.id,
          targetUserId,
        },
      },
      create: { questionnaireId: questionnaire.id, targetUserId },
      update: {},
    });

    const ops = BLOCK4_FACT_QUESTIONS.map((q) => {
      const text = factsByKey[q.key]?.trim();
      if (text) {
        const answerText = text.slice(0, 500);
        return prisma.sponsorFact.upsert({
          where: {
            sponsorBlockId_questionKey: {
              sponsorBlockId: block.id,
              questionKey: q.key,
            },
          },
          create: { sponsorBlockId: block.id, questionKey: q.key, answerText },
          update: { answerText },
        });
      }
      // champ vidé → on supprime l'éventuel fait existant
      return prisma.sponsorFact.deleteMany({
        where: { sponsorBlockId: block.id, questionKey: q.key },
      });
    });

    await prisma.$transaction(ops);
    return { ok: true };
  } catch (err) {
    return mapError(err);
  }
}

function mapError(err: unknown): { ok: false; error: string } {
  if (err instanceof QuestionnaireDisabledError)
    return { ok: false, error: "Feature désactivée." };
  if (err instanceof QuestionnaireForbiddenError)
    return { ok: false, error: `Non autorisé (${err.message}).` };
  const detail = err instanceof Error ? err.message : String(err);
  return { ok: false, error: `Erreur: ${detail}` };
}
