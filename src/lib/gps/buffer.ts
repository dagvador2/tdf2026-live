import { openDB, DBSchema, IDBPDatabase } from "idb";
import { GpsPoint } from "./tracker";

// `synced` is stored as 0/1 (number) and NOT as boolean.
// Why: IndexedDB does not accept booleans as valid index keys per the W3C spec —
// records with boolean-valued indexed properties are silently excluded from the
// index, which made `getUnsyncedPositions()` always return [] and broke sync.
type SyncedFlag = 0 | 1;

interface GpsBufferEntry extends GpsPoint {
  id?: number;
  stageId: string;
  synced: SyncedFlag;
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
const DB_VERSION = 2;

let dbPromise: Promise<IDBPDatabase<GpsBufferDB>> | null = null;

function getDB(): Promise<IDBPDatabase<GpsBufferDB>> {
  if (!dbPromise) {
    dbPromise = openDB<GpsBufferDB>(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion) {
        // v1 → v2 : the previous schema stored `synced` as a boolean, so the
        // `by-synced` index was effectively empty. Wipe the broken store and
        // recreate it from scratch — any unsynced points were unreachable
        // anyway.
        if (oldVersion < 2 && db.objectStoreNames.contains("positions")) {
          db.deleteObjectStore("positions");
        }
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
  return db.add("positions", { ...point, stageId, synced: 0 });
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
      entry.synced = 1;
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

// For testing: close the open connection and clear the cached promise so the
// next call reopens (and re-runs the upgrade callback if the DB was deleted).
export async function _resetDB() {
  if (dbPromise) {
    const db = await dbPromise.catch(() => null);
    db?.close();
    dbPromise = null;
  }
}
