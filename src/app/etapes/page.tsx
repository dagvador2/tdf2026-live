import { prisma } from "@/lib/db";
import { StageTimeline } from "@/components/stages/StageTimeline";
import { PageHero } from "@/components/layout/PageHero";

export const metadata = {
  title: "Étapes — TDF 2026",
  description: "Programme des 6 étapes du Tour de France amateur 2026",
};

// Stage statuses (live / finished badges) must update during the race
export const dynamic = "force-dynamic";

export default async function StagesPage() {
  const stages = await prisma.stage.findMany({
    // Stage 0 is the internal test stage — hidden from the public program
    where: { number: { gte: 1 } },
    orderBy: { number: "asc" },
  });

  return (
    <>
      <PageHero
        kicker="Le parcours"
        title="Programme des étapes"
        subtitle="6 étapes dans les Alpes — du 20 au 25 juillet 2026"
      />
      <div className="mx-auto max-w-3xl px-4 py-8">
        <StageTimeline stages={stages} />
      </div>
    </>
  );
}
