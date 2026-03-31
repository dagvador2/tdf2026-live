import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import { TeamHeader } from "@/components/teams/TeamHeader";
import { RiderMiniCard } from "@/components/teams/RiderMiniCard";
import type { Metadata } from "next";

interface Props {
  params: { slug: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const team = await prisma.team.findUnique({ where: { slug: params.slug } });
  if (!team) return { title: "Équipe introuvable" };
  return {
    title: `${team.name} — TDF 2026`,
    description: team.description || `Équipe ${team.name}`,
  };
}

export default async function TeamDetailPage({ params }: Props) {
  const team = await prisma.team.findUnique({
    where: { slug: params.slug },
    include: {
      riders: { orderBy: { firstName: "asc" } },
    },
  });

  if (!team) notFound();

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <TeamHeader
        name={team.name}
        color={team.color}
        description={team.description}
        riderCount={team.riders.length}
      />

      <h2 className="mb-4 mt-8 font-display text-2xl uppercase text-secondary">
        Coureurs
      </h2>
      <div className="flex flex-col gap-3">
        {team.riders.map((rider) => (
          <RiderMiniCard
            key={rider.id}
            firstName={rider.firstName}
            nickname={rider.nickname}
            slug={rider.slug}
            photoUrl={rider.photoUrl}
            teamColor={team.color}
            editionCount={rider.editionCount}
          />
        ))}
      </div>
    </div>
  );
}
