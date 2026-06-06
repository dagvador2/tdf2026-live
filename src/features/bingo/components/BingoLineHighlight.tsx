"use client";

import { GRID_SIZE } from "@/features/bingo/lib/constants";

type Props = {
  lines: string[];
};

// SVG overlay covering the grid. The viewBox is normalised to grid cell units
// (4×4), so the lines sweep from the centre of the first cell to the centre
// of the last cell regardless of pixel size.
export function BingoLineHighlight({ lines }: Props) {
  if (lines.length === 0) return null;

  const segments = lines.map((key) => endpoints(key));

  return (
    <svg
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 h-full w-full"
      viewBox={`0 0 ${GRID_SIZE} ${GRID_SIZE}`}
      preserveAspectRatio="none"
    >
      {segments.map(({ from, to }, i) => (
        <line
          key={i}
          x1={from.x}
          y1={from.y}
          x2={to.x}
          y2={to.y}
          className="bingo-line-sweep"
          stroke="#F2C200"
          strokeWidth="0.16"
          strokeLinecap="round"
        />
      ))}
    </svg>
  );
}

function center(position: number): { x: number; y: number } {
  const row = Math.floor(position / GRID_SIZE);
  const col = position % GRID_SIZE;
  return { x: col + 0.5, y: row + 0.5 };
}

function endpoints(lineKey: string): {
  from: { x: number; y: number };
  to: { x: number; y: number };
} {
  if (lineKey.startsWith("ROW_")) {
    const row = Number(lineKey.slice("ROW_".length));
    return {
      from: center(row * GRID_SIZE),
      to: center(row * GRID_SIZE + (GRID_SIZE - 1)),
    };
  }
  if (lineKey.startsWith("COL_")) {
    const col = Number(lineKey.slice("COL_".length));
    return {
      from: center(col),
      to: center((GRID_SIZE - 1) * GRID_SIZE + col),
    };
  }
  if (lineKey === "DIAG_TLBR") {
    return { from: center(0), to: center(GRID_SIZE * GRID_SIZE - 1) };
  }
  // DIAG_TRBL
  return {
    from: center(GRID_SIZE - 1),
    to: center((GRID_SIZE - 1) * GRID_SIZE),
  };
}
