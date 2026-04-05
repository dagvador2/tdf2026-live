"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { APP_CONFIG } from "@/lib/utils/constants";
import { addPosition, getUnsyncedCount } from "@/lib/gps/buffer";
import { syncBatch, drainBacklog, SyncStatus } from "@/lib/gps/sync";
import { GpsPoint } from "@/lib/gps/tracker";
import { useOnlineStatus } from "./useOnlineStatus";

export function useGPSSync(token: string, stageId: string) {
  const [status, setStatus] = useState<SyncStatus>("online");
  const [bufferedCount, setBufferedCount] = useState(0);
  const [lastError, setLastError] = useState<string | null>(null);
  const online = useOnlineStatus();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const drainingRef = useRef(false);

  const handleNewPoint = useCallback(
    async (point: GpsPoint) => {
      await addPosition(stageId, point);
      const count = await getUnsyncedCount();
      setBufferedCount(count);
    },
    [stageId]
  );

  // Periodic sync when online
  useEffect(() => {
    if (!online) {
      setStatus("buffering");
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    // Drain backlog when coming back online
    if (!drainingRef.current) {
      drainingRef.current = true;
      setStatus("syncing");
      drainBacklog(token, stageId).then(async () => {
        drainingRef.current = false;
        const count = await getUnsyncedCount();
        setBufferedCount(count);
        setStatus("online");
      });
    }

    intervalRef.current = setInterval(async () => {
      if (drainingRef.current) return;
      setStatus("syncing");
      const result = await syncBatch(token, stageId);
      if (result.error) {
        setLastError(result.error);
      } else if (result.syncedCount > 0) {
        setLastError(null);
      }
      const count = await getUnsyncedCount();
      setBufferedCount(count);
      setStatus("online");
    }, APP_CONFIG.GPS_BATCH_INTERVAL_MS);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [online, token, stageId]);

  return { status, bufferedCount, lastError, handleNewPoint };
}
