import "server-only";
import { prisma } from "@/lib/db";
import { BLOCK4_FACT_QUESTIONS } from "@/features/questionnaire/seed/questionnaire-content.seed";

export type AdminParticipantRow = {
  userId: string;
  firstName: string;
  started: boolean;
  completed: boolean;
  knowledgeScore: number | null;
};

export type AdminFactGroup = { prompt: string; answers: string[] };

export type AdminTargetAggregate = {
  userId: string;
  firstName: string;
  groups: AdminFactGroup[]; // faits collectés sur cette personne, source anonymisée
  totalFacts: number;
};

export type AdminQuestionnaireData = {
  totalParticipants: number;
  completedCount: number;
  startedCount: number;
  rows: AdminParticipantRow[];
  aggregates: AdminTargetAggregate[];
};

export async function getAdminQuestionnaireData(): Promise<AdminQuestionnaireData> {
  const users = await prisma.user.findMany({
    where: { riderId: { not: null } },
    select: {
      id: true,
      rider: { select: { firstName: true } },
      questionnaire: {
        select: { startedAt: true, completedAt: true, knowledgeScore: true },
      },
      // SponsorBlocks ciblant cette personne (les faits dits SUR elle)
      sponsoredBy: {
        select: { facts: { select: { questionKey: true, answerText: true } } },
      },
    },
  });

  const named = users
    .filter((u) => u.rider)
    .map((u) => ({
      ...u,
      displayName: u.rider!.firstName,
    }))
    .sort((a, b) => a.displayName.localeCompare(b.displayName, "fr"));

  const rows: AdminParticipantRow[] = named.map((u) => ({
    userId: u.id,
    firstName: u.displayName,
    started: u.questionnaire != null,
    completed: u.questionnaire?.completedAt != null,
    knowledgeScore: u.questionnaire?.knowledgeScore ?? null,
  }));

  const aggregates: AdminTargetAggregate[] = named.map((u) => {
    // Regroupe par question, source anonymisée (on ne mélange pas les auteurs)
    const byKey = new Map<string, string[]>();
    for (const block of u.sponsoredBy) {
      for (const f of block.facts) {
        const text = f.answerText?.trim();
        if (!text) continue;
        const arr = byKey.get(f.questionKey) ?? [];
        arr.push(text);
        byKey.set(f.questionKey, arr);
      }
    }
    const groups: AdminFactGroup[] = BLOCK4_FACT_QUESTIONS.map((q) => ({
      prompt: q.prompt,
      answers: byKey.get(q.key) ?? [],
    })).filter((g) => g.answers.length > 0);

    return {
      userId: u.id,
      firstName: u.displayName,
      groups,
      totalFacts: groups.reduce((n, g) => n + g.answers.length, 0),
    };
  });

  return {
    totalParticipants: named.length,
    completedCount: rows.filter((r) => r.completed).length,
    startedCount: rows.filter((r) => r.started).length,
    rows,
    aggregates,
  };
}
