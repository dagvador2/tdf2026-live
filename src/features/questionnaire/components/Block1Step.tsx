"use client";

import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { PeerPicker } from "@/features/questionnaire/components/PeerPicker";
import type { Block1View, Participant } from "@/features/questionnaire/lib/types";

export function Block1Step({
  q,
  value,
  participants,
  onChangeText,
  onCommitText,
  onChoose,
}: {
  q: Block1View;
  value: string;
  participants: Participant[];
  /** maj locale immédiate (pas de save) */
  onChangeText: (text: string) => void;
  /** persiste la valeur courante (blur / Suivant) */
  onCommitText: () => void;
  /** choix discret (choice / peer) → save + avance */
  onChoose: (text: string) => void;
}) {
  return (
    <div className="flex h-full flex-col gap-5">
      <h2 className="font-display text-3xl uppercase leading-none tracking-tight text-secondary">
        {q.prompt}
      </h2>

      {q.type === "free" && (
        <Input
          autoFocus
          value={value}
          onChange={(e) => onChangeText(e.target.value)}
          onBlur={onCommitText}
          maxLength={500}
          placeholder="Ta réponse…"
          className="h-14 rounded-xl text-lg"
        />
      )}

      {q.type === "choice" && (
        <div className="flex flex-col gap-3">
          {q.options.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => onChoose(opt)}
              className={cn(
                "w-full rounded-xl border-2 px-5 py-4 text-left text-lg font-medium transition-all active:scale-[0.99]",
                value === opt
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-foreground",
              )}
            >
              {opt}
            </button>
          ))}
        </div>
      )}

      {q.type === "peer_picker" && (
        <div className="min-h-0 flex-1">
          <PeerPicker
            participants={participants}
            selectedIds={
              participants
                .filter((p) => p.firstName === value)
                .map((p) => p.userId)
            }
            onToggle={(userId) => {
              const p = participants.find((x) => x.userId === userId);
              if (p) onChoose(p.firstName);
            }}
          />
        </div>
      )}
    </div>
  );
}
