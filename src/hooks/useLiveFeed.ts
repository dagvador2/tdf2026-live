"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type { FeedEvent } from "@/types";

export function useLiveFeed(stageId: string | null) {
  const [newPosts, setNewPosts] = useState<FeedEvent[]>([]);
  const [connected, setConnected] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);

  const handleFeed = useCallback((e: MessageEvent) => {
    try {
      const post: FeedEvent = JSON.parse(e.data);
      setNewPosts((prev) => [post, ...prev]);
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
    es.addEventListener("feed", handleFeed);
    es.addEventListener("ping", () => setConnected(true));
    es.onerror = () => setConnected(false);

    return () => {
      es.close();
      eventSourceRef.current = null;
      setConnected(false);
    };
  }, [stageId, handleFeed]);

  return { newPosts, connected };
}
