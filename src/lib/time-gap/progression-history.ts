import { ProgressionEntry } from "./types";

/**
 * In-memory progression history for all riders in a stage.
 * Stores (distance, timestamp) pairs per rider, kept sorted by distance.
 * Used to compute time gaps via interpolation.
 */
export class ProgressionHistory {
  private history: Map<string, ProgressionEntry[]> = new Map();

  /**
   * Record a progression entry for a rider.
   */
  addEntry(riderId: string, distance: number, timestamp: number): void {
    if (!this.history.has(riderId)) {
      this.history.set(riderId, []);
    }
    const entries = this.history.get(riderId)!;

    // Avoid duplicates at same distance
    const last = entries[entries.length - 1];
    if (last && last.distance >= distance) return;

    entries.push({ distance, timestamp });
  }

  /**
   * Lookup the interpolated timestamp at a given distance for a rider.
   * Returns null if not enough data.
   */
  getTimestampAtDistance(riderId: string, distance: number): number | null {
    const entries = this.history.get(riderId);
    if (!entries || entries.length === 0) return null;

    // Before the first recorded point
    if (distance <= entries[0].distance) {
      return distance === entries[0].distance ? entries[0].timestamp : null;
    }

    // After the last recorded point
    if (distance > entries[entries.length - 1].distance) {
      return null;
    }

    // Binary search for the bracket
    let lo = 0;
    let hi = entries.length - 1;
    while (lo < hi - 1) {
      const mid = (lo + hi) >> 1;
      if (entries[mid].distance <= distance) {
        lo = mid;
      } else {
        hi = mid;
      }
    }

    const a = entries[lo];
    const b = entries[hi];

    // Exact match
    if (a.distance === distance) return a.timestamp;
    if (b.distance === distance) return b.timestamp;

    // Linear interpolation
    const fraction =
      (distance - a.distance) / (b.distance - a.distance);
    return a.timestamp + fraction * (b.timestamp - a.timestamp);
  }

  /**
   * Get the latest distance for a rider.
   */
  getLatestDistance(riderId: string): number | null {
    const entries = this.history.get(riderId);
    if (!entries || entries.length === 0) return null;
    return entries[entries.length - 1].distance;
  }

  /**
   * Get the latest timestamp for a rider.
   */
  getLatestTimestamp(riderId: string): number | null {
    const entries = this.history.get(riderId);
    if (!entries || entries.length === 0) return null;
    return entries[entries.length - 1].timestamp;
  }

  /**
   * Get all rider IDs in this history.
   */
  getRiderIds(): string[] {
    return Array.from(this.history.keys());
  }

  /**
   * Get the number of entries for a rider.
   */
  getEntryCount(riderId: string): number {
    return this.history.get(riderId)?.length ?? 0;
  }

  /**
   * Clear all data (for reloading).
   */
  clear(): void {
    this.history.clear();
  }
}
