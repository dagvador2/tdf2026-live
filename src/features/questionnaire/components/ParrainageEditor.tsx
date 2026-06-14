"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ChevronDown, Check } from "lucide-react";
import { BLOCK4_FACT_QUESTIONS } from "@/features/questionnaire/seed/questionnaire-content.seed";
import { saveSponsorFacts } from "@/features/questionnaire/actions/save-sponsor";
import type { Participant } from "@/features/questionnaire/lib/types";

type FactsMap = Record<string, Record<string, string>>; // userId → key → text

export function ParrainageEditor({
  participants,
  initialFacts,
}: {
  participants: Participant[];
  initialFacts: FactsMap;
}) {
  const [facts, setFacts] = useState<FactsMap>(initialFacts);
  const [openId, setOpenId] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [errorId, setErrorId] = useState<string | null>(null);

  const countFor = (userId: string) =>
    Object.values(facts[userId] ?? {}).filter((v) => v.trim()).length;

  const setFact = (userId: string, key: string, text: string) => {
    setFacts((f) => ({ ...f, [userId]: { ...(f[userId] ?? {}), [key]: text } }));
    setSavedId((s) => (s === userId ? null : s));
  };

  const save = async (userId: string) => {
    setSavingId(userId);
    setErrorId(null);
    const res = await saveSponsorFacts(userId, facts[userId] ?? {});
    setSavingId(null);
    if (res.ok) setSavedId(userId);
    else setErrorId(userId);
  };

  return (
    <div className="space-y-3">
      {participants.map((p) => {
        const open = openId === p.userId;
        const count = countFor(p.userId);
        return (
          <div
            key={p.userId}
            className="overflow-hidden rounded-2xl border border-border bg-card"
          >
            <button
              type="button"
              onClick={() => setOpenId(open ? null : p.userId)}
              className="flex w-full items-center gap-3 px-4 py-3 text-left"
            >
              <Avatar className="h-11 w-11">
                {p.photoUrl && <AvatarImage src={p.photoUrl} alt={p.firstName} />}
                <AvatarFallback className="bg-secondary text-secondary-foreground">
                  {p.firstName.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="font-display text-lg uppercase leading-none tracking-wide">
                  {p.firstName}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {count > 0
                    ? `${count} anecdote${count > 1 ? "s" : ""}`
                    : "Aucune anecdote"}
                </p>
              </div>
              <ChevronDown
                className={cn(
                  "h-5 w-5 shrink-0 text-muted-foreground transition-transform",
                  open && "rotate-180",
                )}
              />
            </button>

            {open && (
              <div className="space-y-3 border-t border-border p-4">
                {BLOCK4_FACT_QUESTIONS.map((fq) => (
                  <label key={fq.key} className="flex flex-col gap-1">
                    <span className="text-sm font-medium text-foreground">
                      {fq.prompt}
                    </span>
                    <Input
                      value={facts[p.userId]?.[fq.key] ?? ""}
                      onChange={(e) => setFact(p.userId, fq.key, e.target.value)}
                      maxLength={500}
                      placeholder="Balance…"
                      className="h-12 rounded-xl"
                    />
                  </label>
                ))}
                <div className="flex items-center gap-3 pt-1">
                  <Button
                    onClick={() => save(p.userId)}
                    disabled={savingId === p.userId}
                    className="h-11 flex-1 text-base"
                  >
                    {savingId === p.userId ? "Enregistrement…" : "Enregistrer"}
                  </Button>
                  {savedId === p.userId && (
                    <span className="flex items-center gap-1 text-sm font-medium text-[hsl(var(--primary))]">
                      <Check className="h-4 w-4" /> Enregistré
                    </span>
                  )}
                </div>
                {errorId === p.userId && (
                  <p className="text-sm text-destructive">
                    Échec de l&apos;enregistrement — réessaie.
                  </p>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
