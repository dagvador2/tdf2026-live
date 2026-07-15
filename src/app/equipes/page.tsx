import { prisma } from "@/lib/db";
import { TeamCarousel } from "@/components/teams/TeamCarousel";
import { PageHero } from "@/components/layout/PageHero";

export const metadata = {
  title: "Équipes — TDF 2026",
  description: "Les 4 équipes du Tour de France amateur 2026",
};

// Rider counts come from the DB — render per request, not at deploy time
export const dynamic = "force-dynamic";

export default async function TeamsPage() {
  const teams = await prisma.team.findMany({
    where: { slug: { not: "sans-equipe" } },
    orderBy: { name: "asc" },
    include: { _count: { select: { riders: true } } },
  });

  return (
    <>
      <PageHero
        kicker="Le peloton"
        title="Les équipes"
        subtitle="4 équipes parodiques, un seul maillot jaune à la fin"
      />
      <div className="mx-auto max-w-6xl px-4 py-10 md:py-14">
        <TeamCarousel
          teams={teams.map((team) => ({
            id: team.id,
            name: team.name,
            slug: team.slug,
            color: team.color,
            description: team.description,
            riderCount: team._count.riders,
            logoUrl: team.logoUrl,
          }))}
        />
      </div>
    </>
  );
}
