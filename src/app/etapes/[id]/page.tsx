import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import { StageInfo } from "@/components/stages/StageInfo";
import { StageDetail } from "@/components/stages/StageDetail";
import { RegisteredRiders } from "@/components/stages/RegisteredRiders";
import { readGPXFile } from "@/lib/gpx/reader";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Radio } from "lucide-react";
import type { Metadata } from "next";

interface Props {
  params: { id: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const stage = await prisma.stage.findUnique({ where: { id: params.id } });
  if (!stage) return { title: "Étape introuvable" };
  return {
    title: `Étape ${stage.number} — ${stage.name} — TDF 2026`,
  };
}

export default async function StageDetailPage({ params }: Props) {
  const stage = await prisma.stage.findUnique({
    where: { id: params.id },
    include: {
      checkpoints: { orderBy: { order: "asc" } },
      entries: {
        include: {
          rider: { include: { team: true } },
        },
        orderBy: { rider: { firstName: "asc" } },
      },
    },
  });

  if (!stage) notFound();

  // Parse GPX if available (read from filesystem, not fetch)
  const gpxData = stage.gpxUrl ? readGPXFile(stage.gpxUrl) : null;

  const isLive = stage.status === "live";
  const isFinished = stage.status === "finished";

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <StageInfo
        number={stage.number}
        name={stage.name}
        type={stage.type}
        date={stage.date}
        distanceKm={stage.distanceKm}
        elevationM={stage.elevationM}
        status={stage.status}
      />

      {/* Live CTA */}
      {isLive && (
        <div className="mt-4 flex justify-center">
          <Button size="lg" className="gap-2" asChild>
            <Link href={`/etapes/${stage.id}/live`}>
              <Radio className="h-4 w-4" />
              Suivre en direct
            </Link>
          </Button>
        </div>
      )}

      {/* Map + Elevation */}
      <div className="mt-6">
        <StageDetail
          gpxData={gpxData}
          checkpoints={stage.checkpoints.map((cp) => ({
            name: cp.name,
            type: cp.type,
            lat: cp.latitude,
            lng: cp.longitude,
            kmFromStart: cp.kmFromStart,
            elevation: cp.elevation,
          }))}
        />
      </div>

      {/* Registered riders */}
      <div className="mt-8">
        <RegisteredRiders entries={stage.entries} />
      </div>

      {/* Results placeholder */}
      {!isFinished && (
        <div className="mt-8 rounded-lg border border-dashed border-border p-6 text-center">
          <p className="text-muted-foreground">
            Résultats à venir après la course
          </p>
        </div>
      )}
    </div>
  );
}
