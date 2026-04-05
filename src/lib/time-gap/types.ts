export interface ProgressionEntry {
  distance: number; // meters from start
  timestamp: number; // Unix ms
}

export interface RiderGap {
  riderId: string;
  distanceFromStart: number;
  timeGapToLeader: number | null; // seconds, null = leader
  riderAheadGap: number | null; // seconds to rider ahead, null = no one ahead
  riderBehindGap: number | null; // seconds to rider behind, null = no one behind
  riderAheadId: string | null;
  riderBehindId: string | null;
}

export interface RiderSnapshot {
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
  timestamp: number;
  riders: RiderSnapshot[];
}
