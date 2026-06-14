"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import type { Block3QView } from "@/features/questionnaire/lib/types";

type Choice = "A" | "B";

export function Block3Step({
  q,
  value,
  onSelect,
}: {
  q: Block3QView;
  value: Choice | null;
  onSelect: (choice: Choice) => void;
}) {
  const [picked, setPicked] = useState<Choice | null>(null);

  function pick(choice: Choice) {
    if (picked) return;
    setPicked(choice);
    window.setTimeout(() => onSelect(choice), 280);
  }

  const active = picked ?? value;

  return (
    <div className="flex h-full flex-col gap-4">
      {/* Image (ou fallback emoji) */}
      <div
        className={cn(
          "relative aspect-[16/10] w-full overflow-hidden rounded-2xl",
          q.fit === "contain" ? "bg-white" : "bg-secondary/5",
        )}
      >
        {q.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={q.image}
            alt=""
            style={{ objectPosition: q.position }}
            className={cn(
              "h-full w-full",
              q.fit === "contain" ? "object-contain p-2" : "object-cover",
            )}
          />
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
          chosen={active === "A"}
          disabled={picked !== null}
          onClick={() => pick("A")}
        />
        <AnswerButton
          label={q.optionB}
          chosen={active === "B"}
          disabled={picked !== null}
          onClick={() => pick("B")}
        />
      </div>
    </div>
  );
}

function AnswerButton({
  label,
  chosen,
  disabled,
  onClick,
}: {
  label: string;
  chosen: boolean;
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
        chosen
          ? "border-secondary bg-secondary text-secondary-foreground"
          : "border-border bg-card text-foreground active:scale-[0.99] disabled:opacity-60",
      )}
    >
      {label}
    </button>
  );
}
