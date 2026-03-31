"use client";

import { Button } from "@/components/ui/button";
import { Play, Pause } from "lucide-react";
import type { PlaybackSpeed } from "@/hooks/useReplayEngine";

interface ReplayControlsProps {
  playing: boolean;
  speed: PlaybackSpeed;
  progress: number;
  currentTime: number;
  startTime: number;
  endTime: number;
  onPlay: () => void;
  onPause: () => void;
  onSetSpeed: (speed: PlaybackSpeed) => void;
  onScrub: (progress: number) => void;
}

const SPEEDS: PlaybackSpeed[] = [5, 10, 20, 50];

export function ReplayControls({
  playing,
  speed,
  progress,
  currentTime,
  startTime,
  onPlay,
  onPause,
  onSetSpeed,
  onScrub,
}: ReplayControlsProps) {
  const elapsed = currentTime - startTime;
  const elapsedStr = formatDuration(elapsed);

  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <div className="flex items-center gap-3">
        {/* Play/Pause */}
        <Button
          size="sm"
          variant={playing ? "outline" : "default"}
          onClick={playing ? onPause : onPlay}
          className="h-9 w-9 p-0"
        >
          {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        </Button>

        {/* Progress bar */}
        <div className="flex-1">
          <input
            type="range"
            min={0}
            max={1}
            step={0.001}
            value={progress}
            onChange={(e) => onScrub(parseFloat(e.target.value))}
            className="h-2 w-full cursor-pointer appearance-none rounded-full bg-muted accent-primary"
          />
        </div>

        {/* Time display */}
        <span className="min-w-[4rem] text-right font-mono text-xs text-muted-foreground">
          {elapsedStr}
        </span>

        {/* Speed controls */}
        <div className="flex gap-1">
          {SPEEDS.map((s) => (
            <button
              key={s}
              onClick={() => onSetSpeed(s)}
              className={`rounded px-2 py-1 text-xs font-mono transition-colors ${
                speed === s
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              ×{s}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function formatDuration(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  return `${m}:${String(s).padStart(2, "0")}`;
}
