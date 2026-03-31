import { ProgressionHistory } from "./progression-history";
import { RiderGap } from "./types";

/**
 * Compute time gaps for all riders based on their current progression.
 *
 * Algorithm:
 * 1. Find the leader (rider with max distance)
 * 2. For each rider, compute gap to leader at the rider's current distance
 * 3. Sort riders by distance, compute adjacent gaps
 */
export function computeTimeGaps(history: ProgressionHistory): RiderGap[] {
  const riderIds = history.getRiderIds();
  if (riderIds.length === 0) return [];

  // Gather current state for each rider
  const riders = riderIds
    .map((riderId) => {
      const distance = history.getLatestDistance(riderId);
      const timestamp = history.getLatestTimestamp(riderId);
      if (distance === null || timestamp === null) return null;
      return { riderId, distance, timestamp };
    })
    .filter(
      (r): r is { riderId: string; distance: number; timestamp: number } =>
        r !== null
    );

  if (riders.length === 0) return [];

  // Sort by distance descending (leader = max distance)
  riders.sort((a, b) => b.distance - a.distance);
  const leaderId = riders[0].riderId;

  const gaps: RiderGap[] = riders.map((rider, index) => {
    // Leader gap
    let timeGapToLeader: number | null = null;
    if (rider.riderId !== leaderId) {
      const leaderTimestampAtMyDistance =
        history.getTimestampAtDistance(leaderId, rider.distance);
      if (leaderTimestampAtMyDistance !== null) {
        timeGapToLeader =
          (rider.timestamp - leaderTimestampAtMyDistance) / 1000;
      }
    }

    // Adjacent: rider ahead (index - 1, closer to front)
    let riderAheadGap: number | null = null;
    let riderAheadId: string | null = null;
    if (index > 0) {
      const ahead = riders[index - 1];
      riderAheadId = ahead.riderId;
      const aheadTimestampAtMyDistance =
        history.getTimestampAtDistance(ahead.riderId, rider.distance);
      if (aheadTimestampAtMyDistance !== null) {
        riderAheadGap =
          (rider.timestamp - aheadTimestampAtMyDistance) / 1000;
      }
    }

    // Adjacent: rider behind (index + 1)
    let riderBehindGap: number | null = null;
    let riderBehindId: string | null = null;
    if (index < riders.length - 1) {
      const behind = riders[index + 1];
      riderBehindId = behind.riderId;
      const myTimestampAtBehindDistance =
        history.getTimestampAtDistance(rider.riderId, behind.distance);
      if (myTimestampAtBehindDistance !== null) {
        riderBehindGap =
          (behind.timestamp - myTimestampAtBehindDistance) / 1000;
      }
    }

    return {
      riderId: rider.riderId,
      distanceFromStart: rider.distance,
      timeGapToLeader,
      riderAheadGap,
      riderBehindGap,
      riderAheadId,
      riderBehindId,
    };
  });

  return gaps;
}
