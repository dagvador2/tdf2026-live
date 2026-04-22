"use client";

import { useStageStatus } from "@/hooks/useStageStatus";
import { RiderDashboard } from "@/components/live/RiderDashboard";
import { CheckCircle } from "lucide-react";

interface StageData {
  id: string;
  number: number;
  name: string;
  status: string;
  distanceKm: number;
  gpxUrl: string | null;
  checkpoints: Array<{
    name: string;
    type: string;
    kmFromStart: number;
  }>;
  checkpointsWithCoords: Array<{
    lat: number;
    lng: number;
    name: string;
    type: string;
    kmFromStart: number;
  }>;
}

interface RiderLiveClientProps {
  riderId: string;
  riderName: string;
  teamColor: string;
  stage: StageData | null;
}

export function RiderLiveClient({
  riderId,
  riderName,
  teamColor,
  stage,
}: RiderLiveClientProps) {
  const liveStatus = useStageStatus(stage?.id ?? null, stage?.status ?? "upcoming");

  // No stage at all
  if (!stage) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-[#0D0D0D] text-white">
        <h1 className="font-mono text-2xl font-bold text-[#F2C200]">
          Pas d&apos;étape prévue
        </h1>
        <p className="mt-2 text-gray-400">
          Reviens quand une étape sera programmée.
        </p>
      </main>
    );
  }

  // Waiting for stage to start
  if (liveStatus === "upcoming") {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-[#0D0D0D] text-white">
        <div className="text-center">
          <h1 className="font-mono text-2xl font-bold text-[#F2C200]">
            Étape {stage.number} — {stage.name}
          </h1>
          <p className="mt-3 text-gray-400">
            En attente du démarrage...
          </p>
          <div className="mt-6 flex items-center justify-center gap-2">
            <span className="inline-block h-3 w-3 animate-pulse rounded-full bg-[#F2C200]" />
            <span className="text-sm text-gray-400">
              L&apos;écran passera automatiquement en mode course
            </span>
          </div>
        </div>
      </main>
    );
  }

  // Stage finished
  if (liveStatus === "finished") {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-[#0D0D0D] text-white">
        <div className="text-center">
          <CheckCircle className="mx-auto h-16 w-16 text-[#F2C200]" />
          <h1 className="mt-4 font-mono text-2xl font-bold text-[#F2C200]">
            Étape terminée !
          </h1>
          <p className="mt-2 text-lg text-white">{riderName}</p>
          <p className="mt-1 text-gray-400">
            Étape {stage.number} — {stage.name}
          </p>
          <p className="mt-6 text-sm text-gray-500">
            Les résultats seront disponibles dans les classements.
          </p>
        </div>
      </main>
    );
  }

  // Stage is live or paused — show the dashboard
  return (
    <RiderDashboard
      riderId={riderId}
      riderName={riderName}
      teamColor={teamColor}
      stageId={stage.id}
      stageName={`Étape ${stage.number} — ${stage.name}`}
      totalDistanceKm={stage.distanceKm}
      gpxUrl={stage.gpxUrl}
      checkpoints={stage.checkpoints}
      checkpointsWithCoords={stage.checkpointsWithCoords}
    />
  );
}
