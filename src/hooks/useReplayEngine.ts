"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ReplayData, ReplayFrame, ReplayTimeRecord, ReplayPost } from "@/lib/replay/types";

export type PlaybackSpeed = 5 | 10 | 20 | 50;

interface ReplayState {
  playing: boolean;
  speed: PlaybackSpeed;
  currentTime: number;
  currentFrame: ReplayFrame | null;
  visiblePosts: ReplayPost[];
  recentCheckpoints: ReplayTimeRecord[];
  progress: number; // 0-1
}

export function useReplayEngine(data: ReplayData | null) {
  const [state, setState] = useState<ReplayState>({
    playing: false,
    speed: 10,
    currentTime: data?.startTime ?? 0,
    currentFrame: null,
    visiblePosts: [],
    recentCheckpoints: [],
    progress: 0,
  });

  const animFrameRef = useRef<number>(0);
  const lastTickRef = useRef<number>(0);
  const stateRef = useRef(state);
  stateRef.current = state;

  const dataRef = useRef(data);
  dataRef.current = data;

  // Reset when data changes
  useEffect(() => {
    if (data) {
      setState((s) => ({
        ...s,
        currentTime: data.startTime,
        currentFrame: data.frames[0] ?? null,
        progress: 0,
        visiblePosts: [],
        recentCheckpoints: [],
      }));
    }
  }, [data]);

  const tick = useCallback(() => {
    const now = performance.now();
    const delta = now - lastTickRef.current;
    lastTickRef.current = now;

    const d = dataRef.current;
    const s = stateRef.current;
    if (!d || !s.playing) return;

    const newTime = s.currentTime + delta * s.speed;

    if (newTime >= d.endTime) {
      setState((prev) => ({
        ...prev,
        playing: false,
        currentTime: d.endTime,
        progress: 1,
      }));
      return;
    }

    // Find frame
    const frameIdx = findFrameIndex(d.frames, newTime);
    const frame = d.frames[frameIdx] ?? null;

    // Posts visible up to current time
    const visiblePosts = d.posts.filter((p) => p.createdAt <= newTime);

    // Recent checkpoint events (last 10 seconds of real time)
    const recentCheckpoints = d.timeRecords.filter(
      (tr) => tr.timestamp <= newTime && tr.timestamp > newTime - 10_000 * s.speed
    );

    const progress = d.totalDurationMs > 0
      ? (newTime - d.startTime) / d.totalDurationMs
      : 0;

    setState((prev) => ({
      ...prev,
      currentTime: newTime,
      currentFrame: frame,
      visiblePosts,
      recentCheckpoints,
      progress,
    }));

    animFrameRef.current = requestAnimationFrame(tick);
  }, []);

  // Play/pause loop
  useEffect(() => {
    if (state.playing) {
      lastTickRef.current = performance.now();
      animFrameRef.current = requestAnimationFrame(tick);
    }
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [state.playing, tick]);

  const play = useCallback(() => {
    setState((s) => ({ ...s, playing: true }));
  }, []);

  const pause = useCallback(() => {
    setState((s) => ({ ...s, playing: false }));
  }, []);

  const setSpeed = useCallback((speed: PlaybackSpeed) => {
    setState((s) => ({ ...s, speed }));
  }, []);

  const scrubTo = useCallback((progress: number) => {
    const d = dataRef.current;
    if (!d) return;
    const newTime = d.startTime + progress * d.totalDurationMs;
    const frameIdx = findFrameIndex(d.frames, newTime);
    const frame = d.frames[frameIdx] ?? null;
    const visiblePosts = d.posts.filter((p) => p.createdAt <= newTime);

    setState((s) => ({
      ...s,
      currentTime: newTime,
      currentFrame: frame,
      visiblePosts,
      recentCheckpoints: [],
      progress,
    }));
  }, []);

  return {
    ...state,
    play,
    pause,
    setSpeed,
    scrubTo,
  };
}

function findFrameIndex(frames: ReplayFrame[], time: number): number {
  let lo = 0;
  let hi = frames.length - 1;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    if (frames[mid].timestamp <= time) {
      lo = mid;
    } else {
      hi = mid - 1;
    }
  }
  return lo;
}
