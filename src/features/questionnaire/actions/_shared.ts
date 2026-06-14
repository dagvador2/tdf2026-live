import "server-only";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db";
import { FEATURE_QUESTIONNAIRE_ENABLED } from "@/features/questionnaire/flags";

export class QuestionnaireDisabledError extends Error {
  constructor() {
    super("Feature questionnaire désactivée");
    this.name = "QuestionnaireDisabledError";
  }
}

export class QuestionnaireForbiddenError extends Error {
  constructor(message = "Non autorisé") {
    super(message);
    this.name = "QuestionnaireForbiddenError";
  }
}

export function assertQuestionnaireEnabled(): void {
  if (!FEATURE_QUESTIONNAIRE_ENABLED) throw new QuestionnaireDisabledError();
}

export async function requireQuestionnaireUser(): Promise<{
  userId: string;
  email: string | null;
}> {
  if (!FEATURE_QUESTIONNAIRE_ENABLED) throw new QuestionnaireDisabledError();
  const session = await auth();
  if (!session?.user?.id)
    throw new QuestionnaireForbiddenError("Non authentifié");
  return { userId: session.user.id, email: session.user.email ?? null };
}

/** Récupère (ou crée) le questionnaire de l'utilisateur. */
export async function getOrCreateQuestionnaire(userId: string) {
  return prisma.questionnaire.upsert({
    where: { userId },
    create: { userId },
    update: {},
  });
}
