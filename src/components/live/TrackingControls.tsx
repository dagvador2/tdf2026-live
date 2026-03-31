"use client";

import type { TrackerState } from "@/lib/gps/tracker";

interface TrackingControlsProps {
  state: TrackerState;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
}

export function TrackingControls({
  state,
  onStart,
  onPause,
  onResume,
  onStop,
}: TrackingControlsProps) {
  return (
    <div className="flex items-center justify-center gap-4">
      {state === "idle" && (
        <button
          onClick={onStart}
          className="rounded-full bg-[#F2C200] px-8 py-4 text-lg font-bold text-black transition-transform active:scale-95"
        >
          Démarrer le tracking
        </button>
      )}

      {state === "tracking" && (
        <>
          <button
            onClick={onPause}
            className="rounded-full bg-gray-700 px-6 py-4 text-lg font-bold text-white transition-transform active:scale-95"
          >
            Pause
          </button>
          <button
            onClick={onStop}
            className="rounded-full bg-red-600 px-6 py-4 text-lg font-bold text-white transition-transform active:scale-95"
          >
            Arrêter
          </button>
        </>
      )}

      {state === "paused" && (
        <>
          <button
            onClick={onResume}
            className="rounded-full bg-[#F2C200] px-6 py-4 text-lg font-bold text-black transition-transform active:scale-95"
          >
            Reprendre
          </button>
          <button
            onClick={onStop}
            className="rounded-full bg-red-600 px-6 py-4 text-lg font-bold text-white transition-transform active:scale-95"
          >
            Arrêter
          </button>
        </>
      )}

      {state === "error" && (
        <button
          onClick={onStart}
          className="rounded-full bg-[#F2C200] px-8 py-4 text-lg font-bold text-black transition-transform active:scale-95"
        >
          Réessayer
        </button>
      )}
    </div>
  );
}
