"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type { LiveSnapshot, RiderPosition } from "@/types";

// Filet de sécurité : on rafraîchit l'instantané même sans push SSE.
const POLL_INTERVAL_MS = 15_000;

export function useLivePositions(stageId: string | null) {
  const [riders, setRiders] = useState<RiderPosition[]>([]);
  const [connected, setConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  const applySnapshot = useCallback((snapshot: LiveSnapshot) => {
    setRiders(snapshot.riders);
    setLastUpdate(new Date(snapshot.timestamp));
  }, []);

  const handlePositions = useCallback(
    (e: MessageEvent) => {
      try {
        applySnapshot(JSON.parse(e.data) as LiveSnapshot);
      } catch {
        // Ignore malformed data
      }
    },
    [applySnapshot]
  );

  // État initial + polling de secours (le SSE ne pousse que les mises à jour)
  useEffect(() => {
    if (!stageId) return;
    let cancelled = false;

    const fetchSnapshot = async () => {
      try {
        const res = await fetch(`/api/live/snapshot?stageId=${stageId}`, {
          cache: "no-store",
        });
        if (!res.ok) return;
        const snapshot = (await res.json()) as LiveSnapshot;
        if (!cancelled && Array.isArray(snapshot.riders)) {
          applySnapshot(snapshot);
        }
      } catch {
        // réseau indisponible — le prochain tick réessaiera
      }
    };

    fetchSnapshot();
    const poll = setInterval(fetchSnapshot, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(poll);
    };
  }, [stageId, applySnapshot]);

  // Flux SSE temps réel
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
