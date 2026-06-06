import "server-only";
import { sseManager } from "@/lib/sse/manager";
import { SSE_EVENT_TYPES } from "@/features/bingo/lib/constants";
import type { DetectedLine } from "@/features/bingo/lib/bingo-detector";

export function bingoChannel(eventId: string): string {
  return `bingo:${eventId}`;
}

export type BingoValidatedPayload = {
  userId: string;
  userName: string | null;
  cellId: string;
  position: number;
  cellText: string;
  achievements: DetectedLine[];
  validatedAt: string;
};

export type BingoUnvalidatedPayload = {
  userId: string;
  cellId: string;
  position: number;
};

export type BingoFullHousePayload = {
  userId: string;
  userName: string | null;
  achievedAt: string;
};

// Per-user broadcast throttle (one event every 500ms) to absorb double-taps.
const lastBroadcastAt = new Map<string, number>();
const THROTTLE_MS = 500;

function shouldBroadcast(eventId: string, userId: string): boolean {
  const key = `${eventId}::${userId}`;
  const now = Date.now();
  const last = lastBroadcastAt.get(key) ?? 0;
  if (now - last < THROTTLE_MS) return false;
  lastBroadcastAt.set(key, now);
  return true;
}

export function broadcastBingoValidated(
  eventId: string,
  payload: BingoValidatedPayload
): void {
  if (!shouldBroadcast(eventId, payload.userId)) return;
  sseManager.broadcast(bingoChannel(eventId), SSE_EVENT_TYPES.VALIDATED, payload);

  const fullHouse = payload.achievements.find((a) => a.line === "FULL");
  if (fullHouse) {
    sseManager.broadcast(bingoChannel(eventId), SSE_EVENT_TYPES.FULL_HOUSE, {
      userId: payload.userId,
      userName: payload.userName,
      achievedAt: payload.validatedAt,
    } satisfies BingoFullHousePayload);
  }
}

export function broadcastBingoUnvalidated(
  eventId: string,
  payload: BingoUnvalidatedPayload
): void {
  // Unvalidate is rarer and not noisy — bypass the throttle so the UI stays
  // truthful.
  sseManager.broadcast(
    bingoChannel(eventId),
    SSE_EVENT_TYPES.UNVALIDATED,
    payload
  );
}
