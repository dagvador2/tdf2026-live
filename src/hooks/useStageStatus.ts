"use client";

import { useEffect, useRef, useState } from "react";

interface StageStatusEvent {
  stageId: string;
  status: string;
  startTime: string | null;
  endTime: string | null;
}

/**
 * Listens for stage_status SSE events on a given stageId.
 * Returns the latest status ("upcoming" | "live" | "paused" | "finished").
 */
export function useStageStatus(stageId: string | null, initialStatus: string) {
  const [status, setStatus] = useState(initialStatus);
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!stageId) return;

    const es = new EventSource(`/api/live/stream?stageId=${stageId}`);
    esRef.current = es;

    es.addEventListener("stage_status", (e: MessageEvent) => {
      try {
        const data: StageStatusEvent = JSON.parse(e.data);
        setStatus(data.status);
      } catch {
        // ignore
      }
    });

    es.onerror = () => {
      // Will auto-reconnect
    };

    return () => {
      es.close();
      esRef.current = null;
    };
  }, [stageId]);

  return status;
}
