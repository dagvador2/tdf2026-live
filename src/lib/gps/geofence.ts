import { haversine } from "@/lib/utils/haversine";

export interface GeofenceCheckpoint {
  id: string;
  latitude: number;
  longitude: number;
  radiusM: number;
  order: number;
}

export interface GeofenceHit {
  checkpointId: string;
  timestamp: Date;
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

/**
 * Check a batch of positions against ordered checkpoints.
 * Returns geofence hits for the first matching position per checkpoint.
 * Respects checkpoint order: only checks the next expected checkpoint.
 * Handles offline-synced positions (may arrive out of order by timestamp).
 */
export function detectGeofenceHits(
  positions: Array<{
    latitude: number;
    longitude: number;
    timestamp: Date;
  }>,
  checkpoints: GeofenceCheckpoint[],
  alreadyPassed: Set<string>
): GeofenceHit[] {
  const sorted = [...checkpoints].sort((a, b) => a.order - b.order);
  const hits: GeofenceHit[] = [];
  const newlyPassed = new Set(alreadyPassed);

  // Sort positions by timestamp for consistent order
  const sortedPositions = [...positions].sort(
    (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
  );

  for (const pos of sortedPositions) {
    for (const cp of sorted) {
      if (newlyPassed.has(cp.id)) continue;

      if (isInsideGeofence(pos.latitude, pos.longitude, cp)) {
        hits.push({ checkpointId: cp.id, timestamp: pos.timestamp });
        newlyPassed.add(cp.id);
      }
      // Only check the next un-passed checkpoint in order
      break;
    }
  }

  return hits;
}
