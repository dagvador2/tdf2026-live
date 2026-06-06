import type { BingoCategory } from "@prisma/client";

export const GRID_SIZE = 4;
export const GRID_CELL_COUNT = GRID_SIZE * GRID_SIZE; // 16

export const CATEGORY_DISTRIBUTION: Record<BingoCategory, number> = {
  GENERIC: 9,
  GROUP_SPECIFIC: 5,
  SELF_REFERENTIAL: 2,
};

export const NAME_PLACEHOLDER = "{name}";

export const MAX_NAME_REPEAT_PER_GRID = 2;

export const MAX_NOTE_LENGTH = 280;

export const BINGO_SSE_CHANNEL_PREFIX = "bingo";

export const SSE_EVENT_TYPES = {
  VALIDATED: "bingo:validated",
  UNVALIDATED: "bingo:unvalidated",
  FULL_HOUSE: "bingo:full_house",
} as const;
