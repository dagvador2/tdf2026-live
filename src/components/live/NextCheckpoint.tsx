"use client";

interface NextCheckpointProps {
  name: string | null;
  distanceKm: number | null;
  type: string | null;
}

export function NextCheckpoint({
  name,
  distanceKm,
  type,
}: NextCheckpointProps) {
  if (!name) {
    return (
      <div className="rounded-lg bg-gray-900 px-4 py-3 text-center">
        <span className="text-xs font-medium uppercase tracking-wider text-gray-400">
          Prochain objectif
        </span>
        <p className="mt-1 text-lg text-gray-500">—</p>
      </div>
    );
  }

  const typeIcon =
    type === "col" ? "\u26F0" : type === "finish" ? "\uD83C\uDFC1" : "\u25CF";

  return (
    <div className="rounded-lg bg-gray-900 px-4 py-3 text-center">
      <span className="text-xs font-medium uppercase tracking-wider text-gray-400">
        Prochain objectif
      </span>
      <p className="mt-1 text-lg font-semibold text-white">
        {typeIcon} {name}
      </p>
      {distanceKm !== null && (
        <p className="font-mono text-sm text-gray-400">
          dans {distanceKm.toFixed(1)} km
        </p>
      )}
    </div>
  );
}
