"use client";

import { useEffect, useRef, useState } from "react";
import { Check } from "lucide-react";
import type { BingoCellDTO } from "./BingoGridClient";

const LONG_PRESS_MS = 450;

type Props = {
  cell: BingoCellDTO;
  onTap: () => void;
  onLongPress: () => void;
};

export function BingoCell({ cell, onTap, onLongPress }: Props) {
  const validated = cell.validatedAt !== null;
  const [pulse, setPulse] = useState(false);
  const wasValidated = useRef(validated);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressFired = useRef(false);

  // Trigger the pulse animation when the cell transitions to validated.
  useEffect(() => {
    if (validated && !wasValidated.current) {
      setPulse(true);
      const t = setTimeout(() => setPulse(false), 320);
      return () => clearTimeout(t);
    }
    wasValidated.current = validated;
  }, [validated]);

  const cancelLongPress = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const handlePointerDown = () => {
    longPressFired.current = false;
    cancelLongPress();
    longPressTimer.current = setTimeout(() => {
      longPressFired.current = true;
      onLongPress();
    }, LONG_PRESS_MS);
  };

  const handlePointerUp = () => {
    cancelLongPress();
    if (!longPressFired.current) onTap();
  };

  const handlePointerCancel = () => {
    cancelLongPress();
    longPressFired.current = false;
  };

  return (
    <button
      type="button"
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerCancel}
      onPointerCancel={handlePointerCancel}
      className={[
        "relative flex aspect-square items-center justify-center rounded-md border p-1.5 text-center text-[11px] leading-tight transition-transform sm:text-xs",
        "[text-wrap:balance] select-none",
        validated
          ? "border-primary bg-primary font-bold text-primary-foreground"
          : "border-secondary/20 bg-background text-secondary",
        pulse ? "animate-bingo-pulse" : "",
      ].join(" ")}
      aria-pressed={validated}
    >
      <span className="line-clamp-4">{cell.text}</span>
      {validated ? (
        <span className="absolute right-1 top-1 rounded-full bg-secondary/90 p-0.5 text-primary">
          <Check className="h-3 w-3" strokeWidth={3} />
        </span>
      ) : null}
    </button>
  );
}
