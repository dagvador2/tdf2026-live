"use client";

import { knowledgeLabel, KNOWLEDGE_MAX } from "@/features/questionnaire/seed/questionnaire-content.seed";

export function FinalScreen({ knowledgeScore }: { knowledgeScore: number | null }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-6 text-center">
      <div className="text-7xl">🎉</div>
      <h2 className="font-display text-4xl uppercase leading-none tracking-tight text-secondary">
        Merci, ton profil est complet !
      </h2>
      {knowledgeScore !== null && (
        <div className="rounded-2xl bg-secondary px-6 py-4 text-secondary-foreground">
          <p className="font-mono text-3xl">
            {knowledgeScore}/{KNOWLEDGE_MAX}
          </p>
          <p className="mt-1 font-display text-xl uppercase tracking-wide text-primary">
            {knowledgeLabel(knowledgeScore)}
          </p>
        </div>
      )}
      <p className="max-w-xs text-muted-foreground">
        Ce que tu viens de remplir va servir à des trucs… 👀
      </p>
    </div>
  );
}
