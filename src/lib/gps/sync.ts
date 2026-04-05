import { APP_CONFIG } from "@/lib/utils/constants";
import {
  getUnsyncedPositions,
  markAsSynced,
  GpsBufferEntry,
} from "./buffer";

export type SyncStatus = "online" | "buffering" | "syncing";

export interface SyncResult {
  success: boolean;
  syncedCount: number;
  error?: string;
}

export async function syncBatch(
  token: string,
  stageId: string
): Promise<SyncResult> {
  const entries = await getUnsyncedPositions(
    APP_CONFIG.GPS_OFFLINE_BATCH_SIZE
  );
  if (entries.length === 0) {
    return { success: true, syncedCount: 0 };
  }

  const positions = entries.map((e: GpsBufferEntry) => ({
    lat: e.latitude,
    lng: e.longitude,
    alt: e.altitude,
    speed: e.speed,
    acc: e.accuracy,
    ts: e.timestamp,
  }));

  try {
    const res = await fetch("/api/gps/batch", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ stageId, positions }),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error(`[GPS Sync] ${res.status} — ${text}`);
      return { success: false, syncedCount: 0, error: `${res.status}: ${text}` };
    }

    const ids = entries
      .map((e) => e.id)
      .filter((id): id is number => id !== undefined);
    await markAsSynced(ids);

    return { success: true, syncedCount: entries.length };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Network error";
    console.error(`[GPS Sync] Network error — ${msg}`);
    return {
      success: false,
      syncedCount: 0,
      error: msg,
    };
  }
}

export async function drainBacklog(
  token: string,
  stageId: string
): Promise<number> {
  let totalSynced = 0;
  let batch: SyncResult;

  do {
    batch = await syncBatch(token, stageId);
    totalSynced += batch.syncedCount;
  } while (batch.success && batch.syncedCount > 0);

  return totalSynced;
}
