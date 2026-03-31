"use client";

import { useEffect, useRef, useState, useCallback } from "react";

export function useSSE<T = unknown>(url: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [connected, setConnected] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);

  const handleEvent = useCallback((e: MessageEvent) => {
    try {
      setData(JSON.parse(e.data) as T);
    } catch {
      // Ignore malformed data
    }
  }, []);

  useEffect(() => {
    if (!url) return;

    const es = new EventSource(url);
    eventSourceRef.current = es;

    es.addEventListener("connected", () => setConnected(true));
    es.addEventListener("positions", handleEvent);
    es.addEventListener("checkpoint", handleEvent);
    es.addEventListener("feed", handleEvent);
    es.addEventListener("stage_status", handleEvent);
    es.addEventListener("ping", () => setConnected(true));

    es.onerror = () => setConnected(false);

    return () => {
      es.close();
      eventSourceRef.current = null;
      setConnected(false);
    };
  }, [url, handleEvent]);

  return { data, connected };
}
