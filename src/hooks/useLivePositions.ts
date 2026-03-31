"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type { LiveSnapshot, RiderPosition } from "@/types";

export function useLivePositions(stageId: string | null) {
  const [riders, setRiders] = useState<RiderPosition[]>([]);
  const [connected, setConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  const handlePositions = useCallback((e: MessageEvent) => {
    try {
      const snapshot: LiveSnapshot = JSON.parse(e.data);
      setRiders(snapshot.riders);
      setLastUpdate(new Date(snapshot.timestamp));
    } catch {
      // Ignore malformed data
    }
  }, []);

  useEffect(() => {
    if (!stageId) return;

    const url = `/api/live/stream?stageId=${stageId}`;
    const es = new EventSource(url);
    eventSourceRef.current = es;

    es.addEventListener("connected", () => setConnected(true));
    es.addEventListener("positions", handlePositions);
    es.addEventListener("ping", () => setConnected(true));
    es.onerror = () => setConnected(false);

    return () => {
      es.close();
      eventSourceRef.current = null;
      setConnected(false);
    };
  }, [stageId, handlePositions]);

  return { riders, connected, lastUpdate };
}
