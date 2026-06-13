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
    <div className="relative flex h-full w-full overflow-hidden rounded-2xl">
      <Half
        side="A"
        text={duel.optionA.text}
        image={duel.optionA.image}
        position={duel.optionA.position}
        isActive={active === "A"}
        isDimmed={active === "B"}
        onClick={() => handlePick("A")}
      />
      <Half
        side="B"
        text={duel.optionB.text}
        image={duel.optionB.image}
        position={duel.optionB.position}
        isActive={active === "B"}
        isDimmed={active === "A"}
        onClick={() => handlePick("B")}
      />
      {/* Pastille OU au centre */}
      <div className="pointer-events-none absolute left-1/2 top-1/2 z-10 flex h-10 w-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-background bg-secondary font-display text-base text-secondary-foreground shadow-lg">
        OU
      </div>
    </div>
  );
}

function Half({
  side,
  text,
  image,
  position,
  isActive,
  isDimmed,
  onClick,
}: {
  side: Choice;
  text: string;
  image: string | null;
  position: string;
  isActive: boolean;
  isDimmed: boolean;
  onClick: () => void;
}) {
  const bandClass =
    side === "A"
      ? "bg-background/95 text-secondary"
      : "bg-primary/95 text-secondary";

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={isActive}
      className={cn(
        "group relative h-full flex-1 overflow-hidden outline-none transition-all duration-300",
        side === "A" ? "rounded-l-2xl" : "rounded-r-2xl",
        isActive && "z-[5] ring-4 ring-inset ring-secondary",
        isDimmed && "opacity-40 grayscale",
      )}
    >
      {image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={image}
          alt=""
          style={{ objectPosition: position }}
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        <div
          className={cn(
            "absolute inset-0 flex items-center",
            side === "A"
              ? "bg-secondary text-secondary-foreground"
              : "bg-primary text-secondary",
          )}
        >
          <span className="block w-full break-words px-3 text-center font-display text-base uppercase leading-[1.15] tracking-wide">
            {text}
          </span>
        </div>
      )}

      {/* Bandeau texte en bas (uniquement quand il y a une photo) */}
      {image && (
        <div
          className={cn(
            "absolute inset-x-0 bottom-0 px-2 py-3 transition-transform duration-300",
            bandClass,
            isActive && "translate-y-0",
          )}
        >
          <span className="block break-words text-center font-display text-base uppercase leading-[1.05] tracking-wide sm:text-lg">
            {text}
          </span>
        </div>
      )}
    </button>
  );
}
