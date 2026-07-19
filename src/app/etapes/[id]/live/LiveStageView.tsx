"use client";

import dynamic from "next/dynamic";
import { useLivePositions } from "@/hooks/useLivePositions";
import { LiveLeaderboard } from "@/components/live/LiveLeaderboard";
import { ClmLiveStandings } from "@/components/live/ClmLiveStandings";

const LiveMap = dynamic(
  () => import("@/components/live/LiveMap").then((m) => m.LiveMap),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[400px] items-center justify-center rounded-lg bg-muted">
        <p className="text-sm text-muted-foreground">Chargement de la carte live…</p>
      </div>
    ),
  }
);

const LiveElevation = dynamic(
  () => import("@/components/live/LiveElevation").then((m) => m.LiveElevation),
  { ssr: false }
);

interface LiveStageViewProps {
  stageId: string;
  stageNumber: number;
  stageName: string;
  stageType: string;
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
  stageType,
  coordinates,
  checkpoints,
  elevationData,
}: LiveStageViewProps) {
  const { riders, connected } = useLivePositions(stageId);
  // Sur un CLM les départs sont décalés : le classement par distance GPS
  // n'a pas de sens, on affiche le classement provisoire aux temps
  const isTimeTrial = stageType === "team_tt" || stageType === "individual_tt";

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

      {isTimeTrial ? (
        <div className="mt-4">
          <ClmLiveStandings stageNumber={stageNumber} />
        </div>
      ) : riders.length > 0 ? (
        <div className="mt-4">
          <LiveLeaderboard riders={riders} />
        </div>
      ) : (
        <div className="mt-4 text-center text-sm text-muted-foreground">
          En attente des données live…
        </div>
      )}

      {elevationData.length > 0 && (
        <div className="mt-4">
          <LiveElevation
            elevationData={elevationData}
            checkpoints={checkpoints}
            riders={riders}
          />
        </div>
      )}
    </div>
  );
}
