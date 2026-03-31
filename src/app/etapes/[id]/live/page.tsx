import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import { parseGPX } from "@/lib/gpx/parser";
import { LiveStageView } from "./LiveStageView";
import type { Metadata } from "next";

interface Props {
  params: { id: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const stage = await prisma.stage.findUnique({ where: { id: params.id } });
  if (!stage) return { title: "Étape introuvable" };
  return {
    title: `LIVE — Étape ${stage.number} — ${stage.name} — TDF 2026`,
  };
}

export default async function LivePage({ params }: Props) {
  const stage = await prisma.stage.findUnique({
    where: { id: params.id },
    include: {
      checkpoints: { orderBy: { order: "asc" } },
    },
  });

  if (!stage) notFound();

  let gpxData = null;
  if (stage.gpxUrl) {
    try {
      const response = await fetch(stage.gpxUrl);
      const gpxString = await response.text();
      gpxData = parseGPX(gpxString);
    } catch {
      // GPX unavailable
    }
  }

  const coordinates: [number, number][] = gpxData
    ? gpxData.coordinates.map((c) => [c.lng, c.lat])
    : [];

  const checkpoints = stage.checkpoints.map((cp) => ({
    lat: cp.latitude,
    lng: cp.longitude,
    name: cp.name,
    type: cp.type,
    kmFromStart: cp.kmFromStart,
    elevation: cp.elevation ?? undefined,
  }));

  const elevationData = gpxData?.elevationProfile || [];

  return (
    <LiveStageView
      stageId={stage.id}
      stageNumber={stage.number}
      stageName={stage.name}
      coordinates={coordinates}
      checkpoints={checkpoints}
      elevationData={elevationData}
    />
  );
}
