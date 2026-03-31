"use client";

import { useCallback, useRef, useState } from "react";
import { GpsTracker, GpsPoint, TrackerState } from "@/lib/gps/tracker";

export function useGPSTracker(onPoint: (point: GpsPoint) => void) {
  const [state, setState] = useState<TrackerState>("idle");
  const [error, setError] = useState<string | null>(null);
  const trackerRef = useRef<GpsTracker | null>(null);

  const getTracker = useCallback(() => {
    if (!trackerRef.current) {
      trackerRef.current = new GpsTracker({
        onPoint,
        onStateChange: setState,
        onError: (err) => setError(err.message),
      });
    }
    return trackerRef.current;
  }, [onPoint]);

  const start = useCallback(async () => {
    setError(null);
    await getTracker().start();
  }, [getTracker]);

  const pause = useCallback(() => {
    getTracker().pause();
  }, [getTracker]);

  const resume = useCallback(async () => {
    setError(null);
    await getTracker().resume();
  }, [getTracker]);

  const stop = useCallback(() => {
    getTracker().stop();
    setError(null);
  }, [getTracker]);

  return { state, error, start, pause, resume, stop };
}
