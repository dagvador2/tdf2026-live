"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import type { Block3QView } from "@/features/questionnaire/lib/types";

type Choice = "A" | "B";

type AnswerOutcome =
  | { ok: true; isCorrect: boolean | null }
  | { ok: false; error: string };

export function Block3Step({
  q,
  value,
  onAnswer,
  onAdvance,
}: {
  q: Block3QView;
  value: Choice | null;
  onAnswer: (choice: Choice) => Promise<AnswerOutcome>;
  onAdvance: () => void;
}) {
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<{ choice: Choice; correct: boolean } | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);

  async function pick(choice: Choice) {
    if (pending || result) return;
    setPending(true);
    setError(null);
    const out = await onAnswer(choice);
    setPending(false);
    if (!out.ok) {
      setError(out.error);
      return;
    }
    setResult({ choice, correct: out.isCorrect === true });
    window.setTimeout(onAdvance, 1100);
  }

  return (
    <div className="flex h-full flex-col gap-4">
      {/* Image (ou fallback emoji) */}
      <div className="relative aspect-[16/10] w-full overflow-hidden rounded-2xl bg-secondary/5">
        {q.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={q.image} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-secondary text-7xl">
            ⚙️
          </div>
        )}
      </div>

      <h2 className="font-display text-3xl uppercase leading-none tracking-tight text-secondary">
        {q.prompt}
      </h2>

      <div className="flex flex-col gap-3">
        <AnswerButton
          label={q.optionA}
          chosen={result?.choice === "A" || value === "A"}
          state={result?.choice === "A" ? (result.correct ? "good" : "bad") : "idle"}
          disabled={pending || result !== null}
          onClick={() => pick("A")}
        />
        <AnswerButton
          label={q.optionB}
          chosen={result?.choice === "B" || value === "B"}
          state={result?.choice === "B" ? (result.correct ? "good" : "bad") : "idle"}
          disabled={pending || result !== null}
          onClick={() => pick("B")}
        />
      </div>

      {result && (
        <p
          className={cn(
            "animate-in fade-in zoom-in-95 text-center font-display text-2xl uppercase tracking-wide",
            result.correct ? "text-[hsl(var(--primary))]" : "text-destructive",
          )}
        >
          {result.correct ? "Bien vu ! 🎯" : "Raté ! 😅"}
        </p>
      )}
      {error && <p className="text-center text-sm text-destructive">{error}</p>}
    </div>
  );
}

function AnswerButton({
  label,
  chosen,
  state,
  disabled,
  onClick,
}: {
  label: string;
  chosen: boolean;
  state: "idle" | "good" | "bad";
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "w-full rounded-xl border-2 px-5 py-4 text-left text-lg font-medium transition-all duration-200",
        state === "idle" &&
          chosen &&
          "border-secondary bg-secondary text-secondary-foreground",
        state === "idle" &&
          !chosen &&
          "border-border bg-card text-foreground active:scale-[0.99] disabled:opacity-60",
        state === "good" && "border-[hsl(var(--primary))] bg-[hsl(var(--primary))]/15",
        state === "bad" && "border-destructive bg-destructive/10",
      )}
    >
      {label}
    </button>
  );
}
