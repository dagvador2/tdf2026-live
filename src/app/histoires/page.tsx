import { prisma } from "@/lib/db";
import { StoryCard, FeaturedStoryCard } from "@/components/stories/StoryCard";
import { CategoryFilter } from "@/components/stories/CategoryFilter";
import { ReadingProgress } from "@/components/stories/ReadingProgress";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Histoires du Tour — TDF 2026 Live",
  description:
    "Plongez dans les moments légendaires du Tour de France. Duels mythiques, exploits hors normes, drames inoubliables, cols légendaires.",
};

export const dynamic = "force-dynamic";

// Genese du Tour : pinned en "A la une" tant qu'elle est publiee, et tant
// qu'aucun filtre categorie n'est applique. Sinon fallback sur la plus
// recente.
const FEATURED_SLUG = "avenement-tour-de-france-1903";

export default async function HistoiresPage({
  searchParams,
}: {
  searchParams: { cat?: string };
}) {
  const stories = await prisma.tourStory.findMany({
    where: { publishedAt: { not: null } },
    orderBy: { publishedAt: "desc" },
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
  });

  const counts: Record<string, number> = {};
  for (const s of stories) {
    counts[s.category] = (counts[s.category] ?? 0) + 1;
  }

  const filter = searchParams.cat ?? null;
  const filtered = filter ? stories.filter((s) => s.category === filter) : stories;

  // Pin genesis story as featured when no filter is applied and it's published;
  // otherwise fall back to the most recent.
  let featured: (typeof filtered)[number] | undefined;
  let rest: typeof filtered;
  if (!filter) {
    const pinned = filtered.find((s) => s.slug === FEATURED_SLUG);
    if (pinned) {
      featured = pinned;
      rest = filtered.filter((s) => s.slug !== FEATURED_SLUG);
    } else {
      [featured, ...rest] = filtered;
    }
  } else {
    [featured, ...rest] = filtered;
  }

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden bg-secondary px-6 py-16 text-secondary-foreground">
        <div
          className="absolute inset-0 opacity-[0.05]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 50%, #F2C200 1px, transparent 1px), radial-gradient(circle at 80% 50%, #F2C200 1px, transparent 1px)",
            backgroundSize: "80px 80px",
          }}
        />
        <div className="relative mx-auto max-w-3xl text-center">
          <span className="mb-4 inline-block rounded-full bg-primary px-3 py-1 text-xs font-bold uppercase tracking-widest text-primary-foreground">
            {stories.length} récits
          </span>
          <h1 className="mb-3 font-display text-5xl uppercase tracking-wider text-primary md:text-6xl">
            Histoires du Tour
          </h1>
          <p className="text-base opacity-90 md:text-lg">
            Plongez dans les moments légendaires du Tour de France. Duels mythiques, exploits hors
            normes, drames inoubliables, cols légendaires.
          </p>
          <ReadingProgress slugs={stories.map((s) => s.slug)} />
        </div>
      </section>

      {/* Filters */}
      <CategoryFilter counts={counts} total={stories.length} />

      {/* Empty state */}
      {filtered.length === 0 && (
        <div className="mx-auto max-w-3xl px-6 py-24 text-center text-muted-foreground">
          <p className="text-lg">Aucune histoire publiée pour le moment.</p>
          {filter && (
            <p className="mt-2 text-sm">
              Aucune histoire dans la catégorie <strong>{filter}</strong>.
            </p>
          )}
        </div>
      )}

      {/* Featured */}
      {featured && (
        <section className="mx-auto mt-6 max-w-7xl px-6">
          <FeaturedStoryCard story={featured} />
        </section>
      )}

      {/* Grid */}
      {rest.length > 0 && (
        <section className="mx-auto grid max-w-7xl gap-6 px-6 py-10 [grid-template-columns:repeat(auto-fill,minmax(320px,1fr))] pb-16">
          {rest.map((s) => (
            <StoryCard key={s.slug} story={s} />
          ))}
        </section>
      )}
    </div>
  );
}
