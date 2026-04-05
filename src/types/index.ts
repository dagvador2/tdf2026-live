import type {
  Team,
  Rider,
  Stage,
  StageEntry,
  Checkpoint,
} from "@prisma/client";

// ── Relations ──────────────────────────────────────

export type TeamWithRiders = Team & {
  riders: Rider[];
};

export type RiderWithTeam = Rider & {
  team: Team;
};

export type StageWithDetails = Stage & {
  checkpoints: Checkpoint[];
  entries: (StageEntry & { rider: RiderWithTeam })[];
};

// ── SSE / Live ─────────────────────────────────────

export interface RiderPosition {
  riderId: string;
  firstName: string;
  teamColor: string;
  latitude: number;
  longitude: number;
  speed: number | null;
  distanceFromStart: number;
  timeGapToLeader: number | null;
  riderAhead: { id: string; firstName: string; gap: number } | null;
  riderBehind: { id: string; firstName: string; gap: number } | null;
}

export interface LiveSnapshot {
  stageId: string;
  timestamp: string;
  riders: RiderPosition[];
}

export interface CheckpointEvent {
  riderId: string;
  riderFirstName: string;
  checkpointName: string;
  checkpointType: string;
  timestamp: string;
}

export interface FeedEvent {
  id: string;
  type: string;
  content: string;
  photoUrl: string | null;
  createdAt: string;
}

export interface StageStatusEvent {
  stageId: string;
  status: string;
  startTime: string | null;
  endTime: string | null;
}

export type SSEEvent =
  | { event: "positions"; data: LiveSnapshot }
  | { event: "checkpoint"; data: CheckpointEvent }
  | { event: "feed"; data: FeedEvent }
  | { event: "stage_status"; data: StageStatusEvent }
  | { event: "ping"; data: Record<string, never> };

// ── GPS ────────────────────────────────────────────

export interface GPSPoint {
  lat: number;
  lng: number;
  alt: number | null;
  speed: number | null;
  acc: number | null;
  ts: number; // Unix timestamp ms
}

export interface GPSBatchPayload {
  stageId: string;
  positions: GPSPoint[];
}

// ── Time Gap ───────────────────────────────────────

export interface TimeGap {
  riderId: string;
  gapSeconds: number | null;
  formatted: string;
}
