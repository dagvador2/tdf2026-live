"use client";

import { useCallback, useMemo, useState, useTransition } from "react";
import { BingoAchievementType, type BingoCategory } from "@prisma/client";
import { validateCellAction } from "@/features/bingo/actions/validate-cell";
import { unvalidateCellAction } from "@/features/bingo/actions/unvalidate-cell";
import { computeAchievementTargets } from "@/features/bingo/lib/bingo-detector";
import { GRID_CELL_COUNT } from "@/features/bingo/lib/constants";
import { formatRelativeFR } from "@/features/bingo/lib/format";
import { BingoCell } from "./BingoCell";
import { BingoLineHighlight } from "./BingoLineHighlight";
import { BingoCellSheet } from "./BingoCellSheet";

export type BingoCellDTO = {
  id: string;
  position: number;
  text: string;
  category: BingoCategory;
  validatedAt: string | null;
  validationNote: string | null;
};

type Props = {
  gridId: string;
  cells: BingoCellDTO[];
  firstBingoAt: string | null;
  fullHouseAt: string | null;
  existingAchievements: { type: BingoAchievementType; line: string }[];
};

type Toast = { id: string; kind: "bingo" | "full"; message: string };

export function BingoGridClient({
  cells: initialCells,
  firstBingoAt: initialFirstBingoAt,
  fullHouseAt: initialFullHouseAt,
  existingAchievements,
}: Props) {
  const [cells, setCells] = useState<BingoCellDTO[]>(initialCells);
  const [firstBingoAt, setFirstBingoAt] = useState<string | null>(
    initialFirstBingoAt
  );
  const [fullHouseAt, setFullHouseAt] = useState<string | null>(
    initialFullHouseAt
  );
  const [selected, setSelected] = useState<BingoCellDTO | null>(null);
  const [highlightedLines, setHighlightedLines] = useState<string[]>(() =>
    existingAchievements
      .filter((a) => a.type !== BingoAchievementType.FULL_HOUSE)
      .map((a) => a.line)
  );
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [, startTransition] = useTransition();

  const validatedCount = cells.filter((c) => c.validatedAt !== null).length;

  const cellsByPosition = useMemo(() => {
    const arr: (BingoCellDTO | null)[] = Array.from(
      { length: GRID_CELL_COUNT },
      () => null
    );
    for (const c of cells) arr[c.position] = c;
    return arr;
  }, [cells]);

  const pushToast = useCallback((toast: Omit<Toast, "id">) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setToasts((prev) => [...prev, { ...toast, id }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  }, []);

  function applyOptimisticValidate(cellId: string, note: string | null) {
    setCells((prev) =>
      prev.map((c) =>
        c.id === cellId
          ? {
              ...c,
              validatedAt: new Date().toISOString(),
              validationNote: note,
            }
          : c
      )
    );
  }

  function applyOptimisticUnvalidate(cellId: string) {
    setCells((prev) =>
      prev.map((c) =>
        c.id === cellId
          ? { ...c, validatedAt: null, validationNote: null }
          : c
      )
    );
  }

  const handleValidate = (cell: BingoCellDTO, note: string) => {
    const trimmedNote = note.trim() === "" ? null : note.trim();
    applyOptimisticValidate(cell.id, trimmedNote);
    setSelected(null);

    startTransition(async () => {
      const res = await validateCellAction({
        cellId: cell.id,
        note: trimmedNote ?? undefined,
      });
      if (!res.ok) {
        // Revert.
        setCells((prev) =>
          prev.map((c) =>
            c.id === cell.id
              ? {
                  ...c,
                  validatedAt: null,
                  validationNote: null,
                }
              : c
          )
        );
        pushToast({ kind: "bingo", message: res.error });
        return;
      }

      const newLines = res.newlyUnlocked
        .filter((a) => a.type !== BingoAchievementType.FULL_HOUSE)
        .map((a) => a.line);
      if (newLines.length > 0) {
        setHighlightedLines((prev) =>
          Array.from(new Set([...prev, ...newLines]))
        );
      }
      if (res.firstBingo) {
        setFirstBingoAt(new Date().toISOString());
        pushToast({ kind: "bingo", message: "BINGO ! 🎉" });
      } else if (newLines.length > 0) {
        pushToast({
          kind: "bingo",
          message: `Nouvelle ligne complétée (${newLines.length}) 🎉`,
        });
      }
      if (res.fullHouse) {
        setFullHouseAt(new Date().toISOString());
        pushToast({ kind: "full", message: "FULL HOUSE 🔥" });
      }
    });
  };

  const handleUnvalidate = (cell: BingoCellDTO) => {
    applyOptimisticUnvalidate(cell.id);
    setSelected(null);

    startTransition(async () => {
      const res = await unvalidateCellAction({ cellId: cell.id });
      if (!res.ok) {
        // Revert with last-known good state (we lost the note; OK for now).
        setCells((prev) =>
          prev.map((c) =>
            c.id === cell.id
              ? {
                  ...c,
                  validatedAt: new Date().toISOString(),
                }
              : c
          )
        );
        pushToast({ kind: "bingo", message: res.error });
        return;
      }
      // Recompute highlights from the new validated set.
      const validatedSet = new Set(
        cellsByPosition
          .filter((c) => c && c.id !== cell.id && c.validatedAt)
          .map((c) => c!.position)
      );
      const targets = computeAchievementTargets(validatedSet)
        .filter((a) => a.type !== BingoAchievementType.FULL_HOUSE)
        .map((a) => a.line);
      setHighlightedLines(targets);
      if (targets.length === 0) setFirstBingoAt(null);
      setFullHouseAt(null);
    });
  };

  return (
    <section className="relative mx-auto w-full max-w-md px-4 pt-4">
      <div className="mb-3 flex items-center justify-between text-sm">
        <span className="font-mono text-base text-secondary">
          {validatedCount}/{GRID_CELL_COUNT}
        </span>
        {firstBingoAt ? (
          <span className="rounded-full bg-primary px-2 py-0.5 font-display text-xs uppercase tracking-wide text-primary-foreground">
            1er bingo · {formatRelativeFR(new Date(firstBingoAt))}
          </span>
        ) : null}
      </div>

      <div className="relative">
        <div className="grid grid-cols-4 gap-2">
          {cellsByPosition.map((cell, position) =>
            cell ? (
              <BingoCell
                key={cell.id}
                cell={cell}
                onTap={() => setSelected(cell)}
                onLongPress={() => setSelected(cell)}
              />
            ) : (
              <div
                key={`empty-${position}`}
                className="aspect-square rounded-md bg-muted/40"
              />
            )
          )}
        </div>
        <BingoLineHighlight lines={highlightedLines} />
      </div>

      {fullHouseAt ? (
        <div className="mt-4 rounded-lg bg-secondary p-3 text-center font-display text-lg uppercase tracking-wide text-primary">
          🔥 Full house · {formatRelativeFR(new Date(fullHouseAt))}
        </div>
      ) : null}

      <BingoCellSheet
        cell={selected}
        onCancel={() => setSelected(null)}
        onValidate={(note) => selected && handleValidate(selected, note)}
        onUnvalidate={() => selected && handleUnvalidate(selected)}
      />

      <div className="pointer-events-none fixed inset-x-0 bottom-6 z-50 flex flex-col items-center gap-2 px-4">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto rounded-full px-4 py-2 font-display text-base uppercase tracking-wide shadow-lg ${
              t.kind === "full"
                ? "bg-secondary text-primary"
                : "bg-primary text-primary-foreground"
            } animate-in fade-in zoom-in-95 duration-300`}
          >
            {t.message}
          </div>
        ))}
      </div>
    </section>
  );
}
