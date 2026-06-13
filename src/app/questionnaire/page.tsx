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
} from "@/features/questionnaire/lib/data";
import { getOrCreateQuestionnaire } from "@/features/questionnaire/actions/_shared";
import { QuestionnaireWizard } from "@/features/questionnaire/components/QuestionnaireWizard";
import type { WizardInitialState } from "@/features/questionnaire/lib/types";

export const dynamic = "force-dynamic";

export default async function QuestionnairePage() {
  if (!FEATURE_QUESTIONNAIRE_ENABLED) notFound();

  const session = await auth();
  if (!session?.user?.id) redirect("/connexion?callbackUrl=/questionnaire");
  if (!isQuestionnaireAllowedForEmail(session.user.email)) notFound();

  // Garantit l'existence du questionnaire (reprise au fil de l'eau).
  await getOrCreateQuestionnaire(session.user.id);

  const [block1, block2, block3, participants, state] = await Promise.all([
    Promise.resolve(getBlock1View()),
    Promise.resolve(getBlock2View()),
    Promise.resolve(getBlock3View()),
    getParticipants(session.user.id),
    getQuestionnaireState(session.user.id),
  ]);

  const initial: WizardInitialState = {
    answers:
      state?.answers.map((a) => ({
        questionKey: a.questionKey,
        answerText: a.answerText,
        answerChoice: a.answerChoice,
      })) ?? [],
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
