import { prisma } from "@/lib/db";
import Link from "next/link";
import { QuestionnairePromptGate } from "@/features/questionnaire/components/QuestionnairePromptGate";
import { VideoHero } from "@/components/home/VideoHero";
import { TeamGrid } from "@/components/home/TeamGrid";
import { StoryCard } from "@/components/stories/StoryCard";
import { StageTypeBadge } from "@/components/stages/StageTypeBadge";
import { SectionHeading } from "@/components/ui/section-heading";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ArrowRight, Mountain, Route as RouteIcon } from "lucide-react";

export default async function Home() {
  const [teams, stages, riderCount, stories] = await Promise.all([
    prisma.team.findMany({
      where: { slug: { not: "sans-equipe" } },
      orderBy: { name: "asc" },
      include: { _count: { select: { riders: true } } },
    }),
    prisma.stage.findMany({
      // Stage 0 is the internal test stage — hidden from the public site
      where: { number: { gte: 1 } },
      orderBy: { number: "asc" },
    }),
    prisma.rider.count({ where: { team: { slug: { not: "sans-equipe" } } } }),
    prisma.tourStory.findMany({
      where: { publishedAt: { not: null } },
      orderBy: { publishedAt: "desc" },
      take: 3,
      select: {
        slug: true,
        title: true,
        subtitle: true,
        year: true,
        category: true,
        excerpt: true,
        readingTimeMin: true,
        heroImageUrl: true,
        heroImagePosition: true,
      },
    }),
  ]);

  const totalKm = stages.reduce((sum, s) => sum + s.distanceKm, 0);
  const totalElevation = stages.reduce((sum, s) => sum + s.elevationM, 0);

  const liveStage = stages.find((s) => s.status === "live") ?? null;
  const nextStage = stages.find(
    (s) => s.status === "upcoming" || s.status === "live"
  );

  const dateStr = nextStage
    ? new Intl.DateTimeFormat("fr-FR", {
        weekday: "long",
        day: "numeric",
        month: "long",
      }).format(nextStage.date)
    : null;

  return (
    <>
      <QuestionnairePromptGate />
      <VideoHero
        riderCount={riderCount}
        stageCount={stages.length}
        totalKm={totalKm}
        totalElevation={totalElevation}
        liveStage={
          liveStage ? { id: liveStage.id, number: liveStage.number } : null
        }
      />

      {/* Next stage */}
      {nextStage && !liveStage && (
        <section className="mx-auto max-w-7xl px-4 py-14">
          <SectionHeading kicker="Au programme" title="Prochaine étape" />
          <Link
            href={`/etapes/${nextStage.id}`}
            className="group block overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg"
          >
            <div className="flex flex-col gap-6 p-6 md:flex-row md:items-center md:p-8">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-secondary font-display text-3xl text-primary">
                {nextStage.number}
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-display text-2xl uppercase text-secondary md:text-3xl">
                  {nextStage.name}
                </h3>
                {dateStr && (
                  <p className="mt-1 text-sm text-muted-foreground first-letter:uppercase">
                    {dateStr}
                  </p>
                )}
                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
                  <StageTypeBadge type={nextStage.type} />
                  <span className="flex items-center gap-1.5 whitespace-nowrap font-mono">
                    <RouteIcon className="h-4 w-4" />
                    {nextStage.distanceKm} km
                  </span>
                  <span className="flex items-center gap-1.5 whitespace-nowrap font-mono">
                    <Mountain className="h-4 w-4" />
                    {nextStage.elevationM.toLocaleString("fr-FR")} m D+
                  </span>
                </div>
              </div>
              <span
                className={cn(
                  buttonVariants({ size: "lg" }),
                  "shrink-0 self-start md:self-auto"
                )}
              >
                Voir le parcours
                <ArrowRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </span>
            </div>
          </Link>
        </section>
      )}

      {/* Teams */}
      <section className="bg-muted/60 py-14">
        <div className="mx-auto max-w-7xl px-4">
          <SectionHeading kicker="Le peloton" title="Les 4 équipes" />
          <TeamGrid teams={teams} />
        </div>
      </section>

      {/* Stories teaser */}
      {stories.length > 0 && (
        <section className="bg-secondary py-14 text-secondary-foreground">
          <div className="mx-auto max-w-7xl px-4">
            <div className="flex items-end justify-between gap-4">
              <SectionHeading
                kicker="La légende"
                title="Histoires du Tour"
                tone="dark"
              />
              <Button
                variant="outline"
                className="mb-8 hidden border-white/30 bg-transparent text-white hover:bg-white/10 hover:text-white md:inline-flex"
                asChild
              >
                <Link href="/histoires">
                  Toutes les histoires
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            </div>
            <div className="grid gap-6 md:grid-cols-3">
              {stories.map((story) => (
                <StoryCard key={story.slug} story={story} />
              ))}
            </div>
            <div className="mt-8 text-center md:hidden">
              <Button
                variant="outline"
                className="border-white/30 bg-transparent text-white hover:bg-white/10 hover:text-white"
                asChild
              >
                <Link href="/histoires">
                  Toutes les histoires
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </section>
      )}
    </>
  );
}
