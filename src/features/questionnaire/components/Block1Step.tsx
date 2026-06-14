"use client";

import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { PeerPicker } from "@/features/questionnaire/components/PeerPicker";
import { OTHER_REGION } from "@/features/questionnaire/seed/questionnaire-content.seed";
import type { Block1View, Participant } from "@/features/questionnaire/lib/types";

export function Block1Step({
  q,
  value,
  participants,
  onChangeText,
  onCommitText,
  onChoose,
  onEnter,
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
  /** touche « Suivant » du clavier sur un champ libre → save + avance */
  onEnter: () => void;
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
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              onEnter();
            }
          }}
          enterKeyHint="next"
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

      {q.type === "select" &&
        (() => {
          // value = région exacte, "Autre pays", ou un pays libre (hors liste).
          const isRegion = q.options.includes(value) && value !== OTHER_REGION;
          const selectValue = value === "" ? "" : isRegion ? value : OTHER_REGION;
          const isOther = selectValue === OTHER_REGION;
          const country = isOther && value !== OTHER_REGION ? value : "";
          return (
            <div className="flex flex-col gap-3">
              <div className="relative">
                <select
                  value={selectValue}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v === OTHER_REGION) {
                      onChangeText(OTHER_REGION);
                      onCommitText();
                    } else {
                      onChoose(v); // région → enregistre + avance
                    }
                  }}
                  className="h-14 w-full appearance-none rounded-xl border-2 border-border bg-card px-4 pr-10 text-lg text-foreground outline-none focus:border-primary"
                >
                  <option value="" disabled>
                    Choisis ta région…
                  </option>
                  {q.options.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
              </div>
              {isOther && (
                <Input
                  autoFocus
                  value={country}
                  onChange={(e) => onChangeText(e.target.value || OTHER_REGION)}
                  onBlur={onCommitText}
                  maxLength={500}
                  placeholder="Ton pays"
                  className="h-14 rounded-xl text-lg"
                />
              )}
            </div>
          );
        })()}

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
