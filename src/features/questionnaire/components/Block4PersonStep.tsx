"use client";

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { BLOCK4_FACT_QUESTIONS } from "@/features/questionnaire/seed/questionnaire-content.seed";
import type { Participant } from "@/features/questionnaire/lib/types";

/**
 * Mini-bloc parrainage : 7 champs courts sur une personne. Chaque champ
 * persiste au blur (saveSponsorFact).
 */
export function Block4PersonStep({
  target,
  facts,
  onChangeFact,
  onCommitFact,
}: {
  target: Participant;
  facts: Record<string, string>;
  onChangeFact: (questionKey: string, text: string) => void;
  onCommitFact: (questionKey: string) => void;
}) {
  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex shrink-0 items-center gap-3">
        <Avatar className="h-14 w-14">
          {target.photoUrl && (
            <AvatarImage src={target.photoUrl} alt={target.firstName} />
          )}
          <AvatarFallback className="bg-secondary text-secondary-foreground">
            {target.firstName.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <h2 className="font-display text-3xl uppercase leading-none tracking-tight text-secondary">
          Parle-nous de {target.firstName}
        </h2>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto pb-2">
        {BLOCK4_FACT_QUESTIONS.map((fq) => (
          <label key={fq.key} className="flex flex-col gap-1">
            <span className="text-sm font-medium text-foreground">
              {fq.prompt}
            </span>
            <Input
              value={facts[fq.key] ?? ""}
              onChange={(e) => onChangeFact(fq.key, e.target.value)}
              onBlur={() => onCommitFact(fq.key)}
              maxLength={500}
              placeholder="Balance…"
              className="h-12 rounded-xl"
            />
          </label>
        ))}
      </div>
    </div>
  );
}
