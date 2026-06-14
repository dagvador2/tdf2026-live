import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db";
import { FEATURE_QUESTIONNAIRE_ENABLED } from "@/features/questionnaire/flags";
import { getPromptImageUrl } from "@/features/questionnaire/lib/manifest";
import { QuestionnairePromptDialog } from "@/features/questionnaire/components/QuestionnairePromptDialog";

/**
 * Décide côté serveur s'il faut afficher le popup d'incitation au questionnaire :
 * feature active, utilisateur connecté, questionnaire pas encore complété.
 * À monter sur les pages d'entrée de l'app (accueil, mon-espace).
 */
export async function QuestionnairePromptGate() {
  if (!FEATURE_QUESTIONNAIRE_ENABLED) return null;

  const session = await auth();
  if (!session?.user?.id) return null;

  const q = await prisma.questionnaire.findUnique({
    where: { userId: session.user.id },
    select: { completedAt: true },
  });
  if (q?.completedAt) return null; // déjà fait → pas de popup

  return <QuestionnairePromptDialog imageUrl={getPromptImageUrl()} />;
}
