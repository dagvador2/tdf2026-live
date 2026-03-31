"use client";

import { ElevationProfile } from "@/components/elevation/ElevationProfile";
import type { RiderPosition } from "@/types";

interface LiveElevationProps {
  elevationData: { distance: number; elevation: number }[];
  checkpoints: { name: string; type: string; kmFromStart: number; elevation?: number }[];
  riders: RiderPosition[];
}

export function LiveElevation({ elevationData, checkpoints, riders }: LiveElevationProps) {
  const riderPositions = riders.map((r) => ({
    distanceFromStart: r.distFromStart,
    firstName: r.firstName,
    teamColor: r.teamColor,
  }));

  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <h3 className="mb-2 font-display text-sm uppercase text-secondary">
        Profil d&apos;élévation
      </h3>
      <ElevationProfile
        data={elevationData}
        checkpoints={checkpoints}
        riderPositions={riderPositions}
        className="h-[140px] w-full md:h-[180px]"
      />
    </div>
  );
}
