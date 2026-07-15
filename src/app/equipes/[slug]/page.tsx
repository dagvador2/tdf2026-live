import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import Image from "next/image";
import { TeamHeader } from "@/components/teams/TeamHeader";
import { RiderStopsList } from "@/components/teams/RiderStopsList";
import { BackLink } from "@/components/ui/back-link";
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
    <>
      <TeamHeader
        name={team.name}
        color={team.color}
        description={team.description}
        riderCount={team.riders.length}
        logoUrl={team.logoUrl}
      />

      <div className="mx-auto max-w-3xl px-4 py-8">
        <BackLink href="/equipes" label="Équipes" />

        <div className="mt-4 overflow-hidden rounded-lg border border-border bg-muted/30">
          <div className="relative" style={{ aspectRatio: "2.4 / 1" }}>
            <Image
              src={`/teams/${team.slug}-jersey.png`}
              alt={`Maillot ${team.name}`}
              fill
              sizes="(max-width: 768px) 100vw, 768px"
              className="object-contain"
              unoptimized
            />
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8 min-[900px]:py-16">
        <h2 className="mb-8 font-display text-2xl uppercase text-secondary min-[900px]:mb-16 min-[900px]:text-4xl">
          Coureurs
        </h2>
        <RiderStopsList
          teamColor={team.color}
          riders={team.riders.map((rider) => ({
            id: rider.id,
            firstName: rider.firstName,
            nickname: rider.nickname,
            slug: rider.slug,
            photoUrl: rider.photoUrl,
            editionCount: rider.editionCount,
            funFacts: rider.funFacts as Record<string, string> | null,
          }))}
        />
      </div>
    </>
  );
}
