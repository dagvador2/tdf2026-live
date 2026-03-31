"use client";

import type { SyncStatus } from "@/lib/gps/sync";

interface ConnectionStatusProps {
  syncStatus: SyncStatus;
  sseConnected: boolean;
  bufferedCount: number;
}

export function ConnectionStatus({
  syncStatus,
  sseConnected,
  bufferedCount,
}: ConnectionStatusProps) {
  const syncLabel =
    syncStatus === "online"
      ? "En ligne"
      : syncStatus === "syncing"
        ? "Envoi..."
        : "Hors ligne";

  const syncColor =
    syncStatus === "online"
      ? "bg-green-500"
      : syncStatus === "syncing"
        ? "bg-yellow-500"
        : "bg-red-500";

  return (
    <div className="flex items-center justify-between rounded-lg bg-gray-900 px-4 py-2 text-xs text-gray-400">
      <div className="flex items-center gap-2">
        <span className={`inline-block h-2 w-2 rounded-full ${syncColor}`} />
        <span>{syncLabel}</span>
      </div>

      {bufferedCount > 0 && (
        <span>{bufferedCount} pos. en attente</span>
      )}

      <div className="flex items-center gap-2">
        <span
          className={`inline-block h-2 w-2 rounded-full ${
            sseConnected ? "bg-green-500" : "bg-gray-600"
          }`}
        />
        <span>{sseConnected ? "SSE" : "SSE off"}</span>
      </div>
    </div>
  );
}
