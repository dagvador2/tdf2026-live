import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import {
  _resetDB,
  addPosition,
  clearSyncedPositions,
  getSyncedCount,
  getUnsyncedCount,
  getUnsyncedPositions,
  markAsSynced,
} from "@/lib/gps/buffer";
import type { GpsPoint } from "@/lib/gps/tracker";

function makePoint(overrides: Partial<GpsPoint> = {}): GpsPoint {
  return {
    latitude: 45.05,
    longitude: 5.72,
    altitude: 1000,
    speed: 8,
    accuracy: 10,
    timestamp: Date.now(),
    ...overrides,
  };
}

describe("gps buffer (IndexedDB)", () => {
  beforeEach(async () => {
    // Close any open connection from the previous test, then wipe the DB so
    // each test starts from scratch with a fresh upgrade.
    await _resetDB();
    await new Promise<void>((resolve) => {
      const req = indexedDB.deleteDatabase("tdf2026-gps-buffer");
      req.onsuccess = req.onerror = req.onblocked = () => resolve();
    });
  });

  it("indexes new positions as unsynced (regression: boolean keys are not valid IndexedDB keys)", async () => {
    await addPosition("stage-1", makePoint());
    await addPosition("stage-1", makePoint({ latitude: 45.06 }));

    expect(await getUnsyncedCount()).toBe(2);
    const unsynced = await getUnsyncedPositions();
    expect(unsynced).toHaveLength(2);
    expect(unsynced[0].synced).toBe(0);
    expect(unsynced[0].stageId).toBe("stage-1");
  });

  it("moves entries to the synced bucket after markAsSynced", async () => {
    const id1 = await addPosition("stage-1", makePoint());
    const id2 = await addPosition("stage-1", makePoint({ latitude: 45.06 }));

    await markAsSynced([id1, id2]);

    expect(await getUnsyncedCount()).toBe(0);
    expect(await getSyncedCount()).toBe(2);
    expect(await getUnsyncedPositions()).toEqual([]);
  });

  it("clearSyncedPositions removes only synced entries", async () => {
    const id1 = await addPosition("stage-1", makePoint());
    await addPosition("stage-1", makePoint({ latitude: 45.06 }));
    await markAsSynced([id1]);

    await clearSyncedPositions();

    expect(await getSyncedCount()).toBe(0);
    expect(await getUnsyncedCount()).toBe(1);
  });

  it("getUnsyncedPositions respects the limit", async () => {
    for (let i = 0; i < 5; i++) {
      await addPosition("stage-1", makePoint({ latitude: 45 + i * 0.001 }));
    }

    const batch = await getUnsyncedPositions(3);
    expect(batch).toHaveLength(3);
  });
});
