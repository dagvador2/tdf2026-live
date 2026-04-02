import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import { RiderProfile } from "@/components/riders/RiderProfile";
import { FunFacts } from "@/components/riders/FunFacts";
import { StageParticipation } from "@/components/riders/StageParticipation";
import { BackLink } from "@/components/ui/back-link";
import type { Metadata } from "next";

interface Props {
  params: { slug: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const rider = await prisma.rider.findUnique({
    where: { slug: params.slug },
    include: { team: true },
  });
  if (!rider) return { title: "Coureur introuvable" };
  return {
    title: `${rider.firstName} — ${rider.team.name} — TDF 2026`,
  };
}

export default async function RiderPage({ params }: Props) {
  const rider = await prisma.rider.findUnique({
    where: { slug: params.slug },
    include: {
      team: true,
      entries: {
        include: {
          stage: {
            select: { number: true, name: true, type: true, distanceKm: true },
          },
        },
        orderBy: { stage: { number: "asc" } },
      },
    },
  });

  if (!rider) notFound();

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <BackLink href={`/equipes/${rider.team.slug}`} label={rider.team.name} />
      <RiderProfile
        firstName={rider.firstName}
        nickname={rider.nickname}
        photoUrl={rider.photoUrl}
        teamName={rider.team.name}
        teamSlug={rider.team.slug}
        teamColor={rider.team.color}
        editionCount={rider.editionCount}
      />

      <div className="mt-8 space-y-6">
        <FunFacts funFacts={rider.funFacts as Record<string, string> | null} />
        <StageParticipation entries={entries(rider)} />
      </div>
    </div>
  );
}

function entries(rider: {
  entries: {
    id: string;
    status: string;
    stage: { number: number; name: string; type: string; distanceKm: number };
  }[];
}) {
  return rider.entries.map((e) => ({
    id: e.id,
    status: e.status,
    stage: {
      number: e.stage.number,
      name: e.stage.name,
      type: e.stage.type,
      distanceKm: e.stage.distanceKm,
    },
  }));
}
