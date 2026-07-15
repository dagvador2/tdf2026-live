import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import { RiderHero } from "@/components/riders/RiderHero";
import { FunFacts } from "@/components/riders/FunFacts";
import { StageParticipation } from "@/components/riders/StageParticipation";
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
        // Stage 0 is the internal test stage — hidden from public profiles
        where: { stage: { number: { gte: 1 } } },
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
    <>
      <RiderHero
        firstName={rider.firstName}
        nickname={rider.nickname}
        photoUrl={rider.photoUrl}
        teamName={rider.team.name}
        teamSlug={rider.team.slug}
        teamColor={rider.team.color}
        editionCount={rider.editionCount}
      />

      <div className="mx-auto max-w-4xl space-y-12 px-4 py-12 md:py-16">
        <FunFacts
          funFacts={rider.funFacts as Record<string, string> | null}
          teamColor={rider.team.color}
        />
        <StageParticipation entries={entries(rider)} teamColor={rider.team.color} />
      </div>
    </>
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
