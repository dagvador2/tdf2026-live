"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import type { Participant } from "@/features/questionnaire/lib/types";

/**
 * Sélecteur de participants. Mode "single" (bloc 1, stocke un nom) ou
 * "multi" (bloc 4, sélection 1-4).
 */
export function PeerPicker({
  participants,
  selectedIds,
  onToggle,
  max,
}: {
  participants: Participant[];
  selectedIds: string[];
  onToggle: (userId: string) => void;
  max?: number;
}) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return participants;
    return participants.filter((p) => p.firstName.toLowerCase().includes(q));
  }, [participants, query]);

  const atMax = max != null && selectedIds.length >= max;

  return (
    <div className="flex h-full flex-col gap-3">
      <Input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Rechercher…"
        className="shrink-0"
      />
      <div className="grid grid-cols-3 gap-3 overflow-y-auto pb-2 sm:grid-cols-4">
        {filtered.map((p) => {
          const selected = selectedIds.includes(p.userId);
          const blocked = !selected && atMax;
          return (
            <button
              key={p.userId}
              type="button"
              disabled={blocked}
              onClick={() => onToggle(p.userId)}
              className={cn(
                "flex flex-col items-center gap-1.5 rounded-xl border-2 p-2 transition-all",
                selected
                  ? "border-primary bg-primary/10"
                  : "border-transparent bg-card",
                blocked && "opacity-40",
              )}
            >
              <Avatar className="h-14 w-14">
                {p.photoUrl && <AvatarImage src={p.photoUrl} alt={p.firstName} />}
                <AvatarFallback className="bg-secondary text-secondary-foreground">
                  {p.firstName.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="line-clamp-1 text-center text-xs font-medium">
                {p.firstName}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
