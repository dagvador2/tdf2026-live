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
      rider: { select: { firstName: true, nickname: true, photoUrl: true } },
    },
  });

  return users
    .filter((u) => u.rider)
    .map((u) => ({
      userId: u.id,
      firstName: u.rider!.nickname?.trim() || u.rider!.firstName,
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
