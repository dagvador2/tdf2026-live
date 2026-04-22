"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Check, Loader2, X } from "lucide-react";
import { toggleStageEntry } from "./actions";

interface StageToggleProps {
  stageId: string;
  initialParticipating: boolean;
  editable: boolean;
  disabledReason?: string;
}

export function StageToggle({
  stageId,
  initialParticipating,
  editable,
  disabledReason,
}: StageToggleProps) {
  const [participating, setParticipating] = useState(initialParticipating);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleToggle() {
    if (!editable) return;
    const next = !participating;
    setError(null);

    startTransition(async () => {
      const res = await toggleStageEntry(stageId, next);
      if (res.ok) {
        setParticipating(next);
      } else {
        setError(res.error ?? "Erreur");
      }
    });
  }

  if (!editable) {
    return (
      <div className="flex flex-col items-end gap-1">
        <span
          className={
            participating
              ? "inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary"
              : "inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground"
          }
        >
          {participating ? (
            <>
              <Check className="h-3 w-3" /> Inscrit
            </>
          ) : (
            <>
              <X className="h-3 w-3" /> Non
            </>
          )}
        </span>
        {disabledReason && (
          <span className="text-[10px] text-muted-foreground">
            {disabledReason}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        type="button"
        size="sm"
        variant={participating ? "default" : "outline"}
        onClick={handleToggle}
        disabled={isPending}
      >
        {isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : participating ? (
          <>
            <Check className="mr-1 h-4 w-4" />
            Je participe
          </>
        ) : (
          "Je participe"
        )}
      </Button>
      {error && <span className="text-xs text-destructive">{error}</span>}
    </div>
  );
}
