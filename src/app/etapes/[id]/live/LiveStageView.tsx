"use client";

import { LiveMap } from "@/components/live/LiveMap";
import { LiveElevation } from "@/components/live/LiveElevation";
import { useLivePositions } from "@/hooks/useLivePositions";

interface LiveStageViewProps {
  stageId: string;
  stageNumber: number;
  stageName: string;
  coordinates: [number, number][];
  checkpoints: {
    lat: number;
    lng: number;
    name: string;
    type: string;
    kmFromStart: number;
    elevation?: number;
  }[];
  elevationData: { distance: number; elevation: number }[];
}

export function LiveStageView({
  stageId,
  stageNumber,
  stageName,
  coordinates,
  checkpoints,
  elevationData,
}: LiveStageViewProps) {
  const { riders, connected } = useLivePositions(stageId);

  return (
    <div className="mx-auto max-w-5xl px-4 py-4">
      <div className="mb-4 flex items-center gap-3">
        <h1 className="font-display text-2xl uppercase text-secondary md:text-3xl">
          Étape {stageNumber} — {stageName}
        </h1>
      </div>

      <LiveMap
        coordinates={coordinates}
        checkpoints={checkpoints}
        riders={riders}
        connected={connected}
      />

      {elevationData.length > 0 && (
        <div className="mt-4">
          <LiveElevation
            elevationData={elevationData}
            checkpoints={checkpoints}
            riders={riders}
          />
        </div>
      )}

      {/* Rider count */}
      <div className="mt-4 text-center text-sm text-muted-foreground">
        {riders.length > 0
          ? `${riders.length} coureurs en course`
          : "En attente des données live…"}
      </div>
    </div>
  );
}
