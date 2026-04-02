import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import { readGPXFile } from "@/lib/gpx/reader";
import { BackLink } from "@/components/ui/back-link";
import { ReplayPlayer } from "@/components/replay/ReplayPlayer";
import type { Metadata } from "next";

interface Props {
  params: { id: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const stage = await prisma.stage.findUnique({ where: { id: params.id } });
  if (!stage) return { title: "Étape introuvable" };
  return {
    title: `Replay — Étape ${stage.number} — ${stage.name} — TDF 2026`,
  };
}

export default async function ReplayPage({ params }: Props) {
  const stage = await prisma.stage.findUnique({
    where: { id: params.id },
    include: {
      checkpoints: { orderBy: { order: "asc" } },
      entries: {
        include: {
          rider: { include: { team: true } },
        },
      },
    },
  });

  if (!stage) notFound();

  if (stage.status !== "finished") {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center">
        <h1 className="font-display text-3xl uppercase text-secondary">
          Replay non disponible
        </h1>
        <p className="mt-2 text-muted-foreground">
          Le replay sera disponible une fois l&apos;étape terminée.
        </p>
      </div>
    );
  }

  const gpxData = stage.gpxUrl ? readGPXFile(stage.gpxUrl) : null;

  const coordinates: [number, number][] = gpxData
    ? gpxData.coordinates.map((c) => [c.lng, c.lat])
    : [];

  const checkpoints = stage.checkpoints.map((cp) => ({
    lat: cp.latitude,
    lng: cp.longitude,
    name: cp.name,
    type: cp.type,
    kmFromStart: cp.kmFromStart,
  }));

  const riderMap: Record<string, { firstName: string; teamColor: string }> = {};
  for (const entry of stage.entries) {
    riderMap[entry.rider.id] = {
      firstName: entry.rider.firstName,
      teamColor: entry.rider.team.color,
    };
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-4">
      <BackLink href={`/etapes/${stage.id}`} label={`Étape ${stage.number}`} />
      <ReplayPlayer
        stageId={stage.id}
        stageNumber={stage.number}
        stageName={stage.name}
        coordinates={coordinates}
        checkpoints={checkpoints}
        riderMap={riderMap}
      />
    </div>
  );
}
