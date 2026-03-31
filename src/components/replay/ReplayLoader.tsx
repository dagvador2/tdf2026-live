"use client";

import { useEffect, useState } from "react";
import { loadReplayData } from "@/lib/replay/loader";
import type { ReplayData } from "@/lib/replay/types";

interface ReplayLoaderProps {
  stageId: string;
}

export function ReplayLoader({ stageId }: ReplayLoaderProps) {
  const [data, setData] = useState<ReplayData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setProgress(30);
        const replayData = await loadReplayData(stageId);
        if (cancelled) return;
        setProgress(100);
        setData(replayData);
      } catch (err) {
        if (cancelled) return;
        setError(
          err instanceof Error ? err.message : "Erreur de chargement"
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [stageId]);

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center py-16">
        <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-[#F2C200]" />
        <p className="text-sm text-gray-500">
          Chargement des données de replay...
        </p>
        <div className="mt-3 h-2 w-64 overflow-hidden rounded-full bg-gray-200">
          <div
            className="h-full rounded-full bg-[#F2C200] transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4 rounded-lg bg-gray-50 p-4 text-center text-sm">
        <div>
          <p className="font-mono text-lg font-bold">{data.frames.length}</p>
          <p className="text-gray-500">Frames</p>
        </div>
        <div>
          <p className="font-mono text-lg font-bold">
            {data.timeRecords.length}
          </p>
          <p className="text-gray-500">Passages</p>
        </div>
        <div>
          <p className="font-mono text-lg font-bold">{data.posts.length}</p>
          <p className="text-gray-500">Posts</p>
        </div>
      </div>

      <p className="text-center text-sm text-gray-400">
        Durée totale :{" "}
        {Math.round(data.totalDurationMs / 60_000)} minutes &middot;{" "}
        {data.frames.reduce((acc, f) => acc + f.positions.length, 0) /
          Math.max(data.frames.length, 1)}{" "}
        coureurs/frame en moyenne
      </p>

      <div className="rounded-lg border bg-white p-8 text-center text-gray-500">
        <p>
          Le player de replay (P6.04) sera branché ici par la fenêtre Frontend.
        </p>
        <p className="mt-1 text-xs text-gray-400">
          Les données sont chargées et prêtes.
        </p>
      </div>
    </div>
  );
}
