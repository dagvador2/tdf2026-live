"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import type { Block2DuelView } from "@/features/questionnaire/lib/types";

type Choice = "A" | "B";

export function Block2Step({
  duel,
  value,
  onSelect,
}: {
  duel: Block2DuelView;
  value: Choice | null;
  onSelect: (choice: Choice) => void;
}) {
  const [picked, setPicked] = useState<Choice | null>(null);

  function handlePick(choice: Choice) {
    if (picked) return;
    setPicked(choice);
    // Laisse jouer l'animation de sélection avant d'avancer.
    window.setTimeout(() => onSelect(choice), 320);
  }

  const active = picked ?? value;

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl">
      <Half
        side="A"
        text={duel.optionA.text}
        image={duel.optionA.image}
        isActive={active === "A"}
        isDimmed={active === "B"}
        onClick={() => handlePick("A")}
      />
      <div className="relative z-10 -my-4 mx-auto flex h-9 w-9 items-center justify-center rounded-full border-2 border-background bg-secondary font-display text-sm text-secondary-foreground shadow-lg">
        OU
      </div>
      <Half
        side="B"
        text={duel.optionB.text}
        image={duel.optionB.image}
        isActive={active === "B"}
        isDimmed={active === "A"}
        onClick={() => handlePick("B")}
      />
    </div>
  );
}

function Half({
  side,
  text,
  image,
  isActive,
  isDimmed,
  onClick,
}: {
  side: Choice;
  text: string;
  image: string | null;
  isActive: boolean;
  isDimmed: boolean;
  onClick: () => void;
}) {
  const bandClass =
    side === "A"
      ? "bg-background/90 text-secondary"
      : "bg-primary/90 text-white";

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={isActive}
      className={cn(
        "group relative flex flex-1 items-center justify-center overflow-hidden outline-none transition-all duration-300",
        isActive && "ring-4 ring-inset ring-primary",
        isDimmed && "scale-[0.98] opacity-40 grayscale",
      )}
    >
      {image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={image}
          alt=""
          className="absolute inset-0 h-full w-full scale-105 object-cover blur-[2px]"
        />
      ) : (
        <div
          className={cn(
            "absolute inset-0",
            side === "A" ? "bg-secondary" : "bg-secondary/80",
          )}
        />
      )}
      <div className="absolute inset-0 bg-black/15" />
      <span
        className={cn(
          "relative mx-4 max-w-[90%] rounded-xl px-5 py-3 text-center font-display text-2xl uppercase leading-tight tracking-wide shadow-md transition-transform duration-300 sm:text-3xl",
          bandClass,
          isActive && "scale-105",
        )}
      >
        {text}
      </span>
    </button>
  );
}
