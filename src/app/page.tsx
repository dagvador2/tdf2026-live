import { prisma } from "@/lib/db";
import { HeroSection } from "@/components/home/HeroSection";
import { CountdownBanner } from "@/components/home/CountdownBanner";
import { TeamGrid } from "@/components/home/TeamGrid";
import { StatsBar } from "@/components/home/StatsBar";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

export default async function Home() {
  const [teams, stages, riderCount] = await Promise.all([
    prisma.team.findMany({
      where: { slug: { not: "sans-equipe" } },
      orderBy: { name: "asc" },
      include: { _count: { select: { riders: true } } },
    }),
    prisma.stage.findMany({
      orderBy: { number: "asc" },
    }),
    prisma.rider.count({ where: { team: { slug: { not: "sans-equipe" } } } }),
  ]);

  const totalKm = stages.reduce((sum, s) => sum + s.distanceKm, 0);
  const totalElevation = stages.reduce((sum, s) => sum + s.elevationM, 0);

  const nextStage = stages.find((s) => s.status === "upcoming" || s.status === "live");

  return (
    <>
      <CountdownBanner />
      <HeroSection />
      <StatsBar
        riderCount={riderCount}
        stageCount={stages.length}
        totalKm={totalKm}
        totalElevation={totalElevation}
      />
      <TeamGrid teams={teams} />

      {/* Next stage CTA */}
      {nextStage && (
        <section className="mx-auto max-w-7xl px-4 pb-12">
          <div className="rounded-lg border border-border bg-card p-6 text-center">
            <p className="text-sm uppercase tracking-wide text-muted-foreground">
              Prochaine étape
            </p>
            <h3 className="mt-1 font-display text-2xl uppercase text-secondary">
              Étape {nextStage.number} — {nextStage.name}
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {nextStage.distanceKm} km · {nextStage.elevationM.toLocaleString("fr-FR")} m D+
            </p>
            <Button className="mt-4" asChild>
              <Link href={`/etapes/${nextStage.id}`}>
                Voir le parcours <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </section>
      )}
    </>
  );
}
