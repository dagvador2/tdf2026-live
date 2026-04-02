import { prisma } from "@/lib/db";
import { TeamCard } from "@/components/teams/TeamCard";

export const metadata = {
  title: "Équipes — TDF 2026",
  description: "Les 4 équipes du Tour de France amateur 2026",
};

export default async function TeamsPage() {
  const teams = await prisma.team.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { riders: true } } },
  });

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="mb-8 font-display text-4xl uppercase text-secondary md:text-5xl">
        Les équipes
      </h1>
      <div className="flex flex-col gap-4">
        {teams.map((team) => (
          <TeamCard
            key={team.id}
            name={team.name}
            slug={team.slug}
            color={team.color}
            description={team.description}
            riderCount={team._count.riders}
            logoUrl={team.logoUrl}
          />
        ))}
      </div>
    </div>
  );
}
