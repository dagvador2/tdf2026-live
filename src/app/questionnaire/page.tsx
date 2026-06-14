import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth/config";
import {
  FEATURE_QUESTIONNAIRE_ENABLED,
  isQuestionnaireAllowedForEmail,
} from "@/features/questionnaire/flags";
import {
  getBlock1View,
  getBlock2View,
  getBlock3View,
} from "@/features/questionnaire/lib/manifest";
import {
  getParticipants,
  getQuestionnaireState,
  getRiderFunFacts,
} from "@/features/questionnaire/lib/data";
import { getOrCreateQuestionnaire } from "@/features/questionnaire/actions/_shared";
import { B1_TO_FUNFACT } from "@/features/questionnaire/seed/questionnaire-content.seed";
import { QuestionnaireWizard } from "@/features/questionnaire/components/QuestionnaireWizard";
import type {
  InitialAnswer,
  WizardInitialState,
} from "@/features/questionnaire/lib/types";

export const dynamic = "force-dynamic";

export default async function QuestionnairePage() {
  if (!FEATURE_QUESTIONNAIRE_ENABLED) notFound();

  const session = await auth();
  if (!session?.user?.id) redirect("/connexion?callbackUrl=/questionnaire");
  if (!isQuestionnaireAllowedForEmail(session.user.email)) notFound();

  // Garantit l'existence du questionnaire (reprise au fil de l'eau).
  await getOrCreateQuestionnaire(session.user.id);

  const [block1, block2, block3, participants, state, funFacts] =
    await Promise.all([
      Promise.resolve(getBlock1View()),
      Promise.resolve(getBlock2View()),
      Promise.resolve(getBlock3View()),
      getParticipants(session.user.id),
      getQuestionnaireState(session.user.id),
      getRiderFunFacts(session.user.id),
    ]);

  // Réponses du questionnaire, puis pré-remplissage du bloc 1 depuis les fun
  // facts du compte (source de vérité partagée — surcharge le questionnaire).
  const answerMap = new Map<string, InitialAnswer>(
    (state?.answers ?? []).map((a) => [
      a.questionKey,
      {
        questionKey: a.questionKey,
        answerText: a.answerText,
        answerChoice: a.answerChoice,
      },
    ]),
  );
  for (const [b1Key, ffKey] of Object.entries(B1_TO_FUNFACT)) {
    const v = funFacts[ffKey]?.trim();
    if (v) {
      answerMap.set(b1Key, {
        questionKey: b1Key,
        answerText: v,
        answerChoice: null,
      });
    }
  }

  const initial: WizardInitialState = {
    answers: Array.from(answerMap.values()),
    sponsorBlocks:
      state?.sponsorings.map((b) => ({
        targetUserId: b.targetUserId,
        facts: b.facts.map((f) => ({
          questionKey: f.questionKey,
          answerText: f.answerText,
        })),
      })) ?? [],
    completed: state?.completedAt != null,
    knowledgeScore: state?.knowledgeScore ?? null,
  };

  return (
    <QuestionnaireWizard
      block1={block1}
      block2={block2}
      block3={block3}
      participants={participants}
      initial={initial}
    />
  );
}
