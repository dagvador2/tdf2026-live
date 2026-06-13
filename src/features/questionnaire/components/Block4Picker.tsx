"use client";

import { PeerPicker } from "@/features/questionnaire/components/PeerPicker";
import type { Participant } from "@/features/questionnaire/lib/types";

export function Block4Picker({
  participants,
  selectedIds,
  onToggle,
}: {
  participants: Participant[];
  selectedIds: string[];
  onToggle: (userId: string) => void;
}) {
  return (
    <div className="flex h-full flex-col gap-4">
      <div className="shrink-0">
        <h2 className="font-display text-3xl uppercase leading-none tracking-tight text-secondary">
          Parraine 1 à 4 personnes 🎤
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Choisis qui tu connais le mieux. Tu balanceras quelques secrets ensuite.
          ({selectedIds.length}/4)
        </p>
      </div>
      <div className="min-h-0 flex-1">
        <PeerPicker
          participants={participants}
          selectedIds={selectedIds}
          onToggle={onToggle}
          max={4}
        />
      </div>
    </div>
  );
}
