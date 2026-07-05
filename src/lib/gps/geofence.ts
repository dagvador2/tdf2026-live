import { haversine } from "@/lib/utils/haversine";
import { APP_CONFIG } from "@/lib/utils/constants";

export interface GeofenceCheckpoint {
  id: string;
  latitude: number;
  longitude: number;
  radiusM: number;
  order: number;
  kmFromStart: number;
  type: string; // "start" | "col" | "sprint" | "finish"
}

export interface GeofenceHit {
  checkpointId: string;
  timestamp: Date;
}

export interface PriorRecord {
  checkpointId: string;
  timestamp: Date;
}

export interface GeofenceResult {
  hits: GeofenceHit[];
  /** Checkpoints armed by this batch (rider seen far from them). */
  newlyArmed: string[];
}

/**
 * Check if a GPS position falls within a checkpoint's radius.
 */
export function isInsideGeofence(
  lat: number,
  lng: number,
  checkpoint: GeofenceCheckpoint
): boolean {
  const distance = haversine(
    lat,
    lng,
    checkpoint.latitude,
    checkpoint.longitude
  );
  return distance <= checkpoint.radiusM;
}

/** Distance beyond which a rider is considered "away" from a checkpoint. */
export function armDistanceM(checkpoint: GeofenceCheckpoint): number {
  return checkpoint.radiusM * APP_CONFIG.GEOFENCE_ARM_FACTOR;
}

/**
 * Compute which checkpoints a set of positions arms (rider seen beyond the
 * arm distance). Used to rebuild in-memory arming state from stored positions
 * after a server restart.
 */
export function computeArmed(
  positions: Array<{ latitude: number; longitude: number }>,
  checkpoints: GeofenceCheckpoint[]
): Set<string> {
  const armed = new Set<string>();
  for (const cp of checkpoints) {
    for (const pos of positions) {
      if (haversine(pos.latitude, pos.longitude, cp.latitude, cp.longitude) > armDistanceM(cp)) {
        armed.add(cp.id);
        break;
      }
    }
  }
  return armed;
}

/**
 * Check a batch of positions against a stage's checkpoints.
 *
 * Every un-passed checkpoint is tested for every position (a missed
 * checkpoint never blocks the following ones). Two guards protect against
 * false hits — all stages are loops where start and finish zones overlap:
 *
 * 1. Arming — a checkpoint (except the start) only counts once the rider has
 *    been seen beyond 2× its radius. A rider waiting on the shared
 *    start/finish line can therefore never trigger the finish.
 * 2. Time gate — a checkpoint at km X can't be hit earlier than X km ridden
 *    at GEOFENCE_MAX_AVG_SPEED_KMH, counted from the last recorded
 *    checkpoint (or the rider's first position of the stage).
 *
 * Positions may arrive out of order (offline sync): they are re-sorted by
 * timestamp first.
 */
export function detectGeofenceHits(
  positions: Array<{
    latitude: number;
    longitude: number;
    timestamp: Date;
  }>,
  checkpoints: GeofenceCheckpoint[],
  opts: {
    priorRecords: PriorRecord[];
    armed: ReadonlySet<string>;
    firstPositionAt: Date;
  }
): GeofenceResult {
  const sorted = [...checkpoints].sort((a, b) => a.order - b.order);
  const cpById = new Map(sorted.map((cp) => [cp.id, cp]));

  const passed = new Set(opts.priorRecords.map((r) => r.checkpointId));
  const armed = new Set(opts.armed);
  const newlyArmed: string[] = [];
  const hits: GeofenceHit[] = [];

  // Gate reference: last recorded checkpoint, else first position (km 0).
  let refTime = opts.firstPositionAt.getTime();
  let refKm = 0;
  for (const record of opts.priorRecords) {
    const cp = cpById.get(record.checkpointId);
    if (cp && cp.kmFromStart >= refKm) {
      refKm = cp.kmFromStart;
      refTime = record.timestamp.getTime();
    }
  }

  const msPerKm = 3_600_000 / APP_CONFIG.GEOFENCE_MAX_AVG_SPEED_KMH;

  const sortedPositions = [...positions].sort(
    (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
  );

  for (const pos of sortedPositions) {
    for (const cp of sorted) {
      if (passed.has(cp.id)) continue;

      const distance = haversine(
        pos.latitude,
        pos.longitude,
        cp.latitude,
        cp.longitude
      );

      if (distance > armDistanceM(cp)) {
        if (!armed.has(cp.id)) {
          armed.add(cp.id);
          newlyArmed.push(cp.id);
        }
        continue;
      }

      if (distance > cp.radiusM) continue;

      // Inside the geofence — apply the guards.
      if (cp.type !== "start" && !armed.has(cp.id)) continue;

      const minElapsedMs = Math.max(0, cp.kmFromStart - refKm) * msPerKm;
      if (pos.timestamp.getTime() - refTime < minElapsedMs) continue;

      hits.push({ checkpointId: cp.id, timestamp: pos.timestamp });
      passed.add(cp.id);
      if (cp.kmFromStart >= refKm) {
        refKm = cp.kmFromStart;
        refTime = pos.timestamp.getTime();
      }
    }
  }

  return { hits, newlyArmed };
}
