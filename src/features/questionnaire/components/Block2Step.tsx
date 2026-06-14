"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import type { Block2DuelView, Fit } from "@/features/questionnaire/lib/types";

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
  const landscape = duel.layout === "landscape";

  return (
    <div
      className={cn(
        "relative flex h-full w-full overflow-hidden rounded-2xl",
        landscape ? "flex-col" : "flex-row",
      )}
    >
      <Half
        side="A"
        text={duel.optionA.text}
        image={duel.optionA.image}
        position={duel.optionA.position}
        fit={duel.optionA.fit}
        bandAtTop
        isActive={active === "A"}
        isDimmed={active === "B"}
        onClick={() => handlePick("A")}
      />
      <Half
        side="B"
        text={duel.optionB.text}
        image={duel.optionB.image}
        position={duel.optionB.position}
        fit={duel.optionB.fit}
        // Paysage : bandeau du bas en bas pour ne pas chevaucher la pastille OU.
        bandAtTop={!landscape}
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
  fit,
  bandAtTop,
  isActive,
  isDimmed,
  onClick,
}: {
  side: Choice;
  text: string;
  image: string | null;
  position: string;
  fit: Fit;
  bandAtTop: boolean;
  isActive: boolean;
  isDimmed: boolean;
  onClick: () => void;
}) {
  const bandClass =
    side === "A"
      ? "bg-background text-secondary"
      : "bg-primary text-secondary";

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={isActive}
      className={cn(
        "group relative flex-1 overflow-hidden outline-none transition-all duration-300",
        fit === "contain" && "bg-white",
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
          className={cn(
            "absolute inset-0 h-full w-full",
            fit === "contain" ? "object-contain p-1" : "object-cover",
          )}
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
          <span className="block w-full break-words px-3 text-center font-display text-xl uppercase leading-[1.15] tracking-wide">
            {text}
          </span>
        </div>
      )}

      {/* Bandeau texte (uniquement quand il y a une photo) */}
      {image && (
        <div
          className={cn(
            "absolute inset-x-0 px-2 py-2.5",
            bandAtTop ? "top-0" : "bottom-0",
            bandClass,
          )}
        >
          <span className="block break-words text-center font-display text-xl uppercase leading-[1.1] tracking-wide sm:text-2xl">
            {text}
          </span>
        </div>
      )}
    </button>
  );
}
