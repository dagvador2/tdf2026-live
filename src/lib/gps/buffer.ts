import { openDB, DBSchema, IDBPDatabase } from "idb";
import { GpsPoint } from "./tracker";

interface GpsBufferEntry extends GpsPoint {
  id?: number;
  stageId: string;
  synced: boolean;
}

interface GpsBufferDB extends DBSchema {
  positions: {
    key: number;
    value: GpsBufferEntry;
    indexes: {
      "by-synced": number; // 0 = unsynced, 1 = synced
    };
  };
}

const DB_NAME = "tdf2026-gps-buffer";
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<GpsBufferDB>> | null = null;

function getDB(): Promise<IDBPDatabase<GpsBufferDB>> {
  if (!dbPromise) {
    dbPromise = openDB<GpsBufferDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        const store = db.createObjectStore("positions", {
          keyPath: "id",
          autoIncrement: true,
        });
        store.createIndex("by-synced", "synced");
      },
    });
  }
  return dbPromise;
}

export async function addPosition(
  stageId: string,
  point: GpsPoint
): Promise<number> {
  const db = await getDB();
  return db.add("positions", { ...point, stageId, synced: false });
}

export async function getUnsyncedPositions(
  limit = 50
): Promise<GpsBufferEntry[]> {
  const db = await getDB();
  const tx = db.transaction("positions", "readonly");
  const index = tx.store.index("by-synced");
  const results: GpsBufferEntry[] = [];

  let cursor = await index.openCursor(IDBKeyRange.only(0));
  while (cursor && results.length < limit) {
    results.push(cursor.value);
    cursor = await cursor.continue();
  }

  return results;
}

export async function markAsSynced(ids: number[]): Promise<void> {
  const db = await getDB();
  const tx = db.transaction("positions", "readwrite");
  for (const id of ids) {
    const entry = await tx.store.get(id);
    if (entry) {
      entry.synced = true;
      await tx.store.put(entry);
    }
  }
  await tx.done;
}

export async function getUnsyncedCount(): Promise<number> {
  const db = await getDB();
  return db.countFromIndex("positions", "by-synced", IDBKeyRange.only(0));
}

export async function getSyncedCount(): Promise<number> {
  const db = await getDB();
  return db.countFromIndex("positions", "by-synced", IDBKeyRange.only(1));
}

export async function clearSyncedPositions(): Promise<void> {
  const db = await getDB();
  const tx = db.transaction("positions", "readwrite");
  const index = tx.store.index("by-synced");

  let cursor = await index.openCursor(IDBKeyRange.only(1));
  while (cursor) {
    await cursor.delete();
    cursor = await cursor.continue();
  }

  await tx.done;
}

// Re-export for external usage
export type { GpsBufferEntry };

// For testing: reset the DB promise
export function _resetDB() {
  dbPromise = null;
}
