"use client";

import { useEffect, useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { MAX_NOTE_LENGTH } from "@/features/bingo/lib/constants";
import type { BingoCellDTO } from "./BingoGridClient";

type Props = {
  cell: BingoCellDTO | null;
  onCancel: () => void;
  onValidate: (note: string) => void;
  onUnvalidate: () => void;
};

export function BingoCellSheet({
  cell,
  onCancel,
  onValidate,
  onUnvalidate,
}: Props) {
  const [note, setNote] = useState("");

  useEffect(() => {
    setNote(cell?.validationNote ?? "");
  }, [cell?.id, cell?.validationNote]);

  const open = cell !== null;
  const validated = cell?.validatedAt !== null && cell?.validatedAt !== undefined;

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onCancel()}>
      <SheetContent
        side="bottom"
        className="rounded-t-2xl border-secondary/10 bg-background p-5"
      >
        <SheetHeader className="text-left">
          <SheetTitle className="font-display text-xl uppercase tracking-tight text-secondary">
            {validated ? "Case validée" : "Valider cette case ?"}
          </SheetTitle>
        </SheetHeader>

        {cell ? (
          <div className="my-4 rounded-md border border-secondary/10 bg-card p-3 text-sm text-secondary">
            {cell.text}
          </div>
        ) : null}

        <label className="block text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Petite note (optionnel)
        </label>
        <textarea
          value={note}
          onChange={(e) =>
            setNote(e.target.value.slice(0, MAX_NOTE_LENGTH))
          }
          maxLength={MAX_NOTE_LENGTH}
          rows={3}
          placeholder="Ex: ravito Sarennes, juste avant la borne 4km"
          className="mt-1 w-full resize-none rounded-md border border-secondary/15 bg-background p-2 text-sm outline-none focus:border-primary"
        />
        <div className="mt-1 text-right text-[10px] text-muted-foreground">
          {note.length}/{MAX_NOTE_LENGTH}
        </div>

        <SheetFooter className="mt-4 flex-row gap-2">
          {validated ? (
            <button
              type="button"
              onClick={onUnvalidate}
              className="flex-1 rounded-full border border-destructive/40 px-4 py-2 text-sm font-semibold text-destructive transition active:scale-[0.98]"
            >
              Annuler la validation
            </button>
          ) : (
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 rounded-full border border-secondary/20 px-4 py-2 text-sm text-secondary transition active:scale-[0.98]"
            >
              Annuler
            </button>
          )}
          <button
            type="button"
            onClick={() => onValidate(note)}
            className="flex-1 rounded-full bg-primary px-4 py-2 font-display text-sm uppercase tracking-wide text-primary-foreground shadow-sm transition active:scale-[0.98]"
          >
            {validated ? "Mettre à jour" : "Valider"}
          </button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
