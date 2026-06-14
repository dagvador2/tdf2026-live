import "server-only";
import { prisma } from "@/lib/db";
import type { Participant } from "@/features/questionnaire/lib/types";

export type { Participant };

/**
 * Liste des participants sélectionnables (peer_picker bloc 1 + parrainage bloc 4) :
 * les users liés à un coureur, soi-même exclu. Triés par prénom.
 */
export async function getParticipants(
  excludeUserId: string,
): Promise<Participant[]> {
  const users = await prisma.user.findMany({
    where: {
      id: { not: excludeUserId },
      riderId: { not: null },
    },
    select: {
      id: true,
      rider: { select: { firstName: true, photoUrl: true } },
    },
  });

  // Prénom réel (pas le surnom) pour le parrainage et le peer-picker.
  return users
    .filter((u) => u.rider)
    .map((u) => ({
      userId: u.id,
      firstName: u.rider!.firstName,
      photoUrl: u.rider!.photoUrl,
    }))
    .sort((a, b) => a.firstName.localeCompare(b.firstName, "fr"));
}

/** État courant du questionnaire d'un user, pour reprise au fil de l'eau. */
export async function getQuestionnaireState(userId: string) {
  const questionnaire = await prisma.questionnaire.findUnique({
    where: { userId },
    include: {
      answers: { select: { questionKey: true, answerText: true, answerChoice: true } },
      sponsorings: {
        select: {
          targetUserId: true,
          facts: { select: { questionKey: true, answerText: true } },
        },
      },
    },
  });
  return questionnaire;
}

export type QuestionnaireState = NonNullable<
  Awaited<ReturnType<typeof getQuestionnaireState>>
>;

/** Fun facts du profil coureur lié à ce user (pour pré-remplir le bloc 1). */
export async function getRiderFunFacts(
  userId: string,
): Promise<Record<string, string>> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { rider: { select: { funFacts: true } } },
  });
  const ff = user?.rider?.funFacts;
  if (ff && typeof ff === "object" && !Array.isArray(ff)) {
    return ff as Record<string, string>;
  }
  return {};
}
