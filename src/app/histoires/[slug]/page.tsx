import Image from "next/image";
import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";
import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { categoryMeta } from "@/lib/stories/categories";
import { CategoryBadge } from "@/components/stories/CategoryBadge";
import { StoryCard } from "@/components/stories/StoryCard";
import { ShareButtons } from "@/components/stories/ShareButtons";

interface PageProps {
  params: { slug: string };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const story = await prisma.tourStory.findUnique({
    where: { slug: params.slug },
    select: { title: true, subtitle: true, excerpt: true, heroImageUrl: true, publishedAt: true },
  });
  if (!story || !story.publishedAt) return { title: "Histoire introuvable" };
  return {
    title: `${story.title} — Histoires du Tour`,
    description: story.subtitle ?? story.excerpt,
    openGraph: {
      title: story.title,
      description: story.excerpt,
      images: story.heroImageUrl ? [story.heroImageUrl] : undefined,
    },
  };
}

export default async function StoryPage({ params }: PageProps) {
  const story = await prisma.tourStory.findUnique({
    where: { slug: params.slug },
  });
  if (!story || !story.publishedAt) notFound();

  const meta = categoryMeta(story.category);

  // 3 related stories: same category first, then fill with random other published
  const related = await prisma.tourStory.findMany({
    where: {
      publishedAt: { not: null },
      slug: { not: story.slug },
    },
    orderBy: [{ category: story.category === "duel" ? "asc" : "desc" }, { publishedAt: "desc" }],
    select: {
      slug: true, title: true, subtitle: true, year: true, category: true,
      excerpt: true, readingTimeMin: true, heroImageUrl: true,
    },
    take: 12,
  });
  // Prefer same category, fall back to others
  const sameCat = related.filter((r) => r.category === story.category).slice(0, 3);
  const others = related.filter((r) => r.category !== story.category);
  const suggestions = [...sameCat, ...others].slice(0, 3);

  return (
    <article>
      {/* Hero */}
      <section
        className="relative flex min-h-[500px] items-end px-6 pb-10 text-white md:min-h-[70vh]"
        style={{
          backgroundImage: story.heroImageUrl
            ? `linear-gradient(to bottom, rgba(27,31,59,0) 0%, rgba(27,31,59,0.3) 50%, rgba(27,31,59,0.95) 100%), url('${story.heroImageUrl}')`
            : `linear-gradient(to bottom, rgba(27,31,59,0.3) 0%, rgba(27,31,59,0.95) 100%), ${meta.gradient}`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="mx-auto w-full max-w-3xl">
          <div className="mb-5 flex flex-wrap items-center gap-3">
            <CategoryBadge category={story.category} />
            <span className="font-mono text-sm font-semibold text-primary">{story.year}</span>
            <span className="text-xs opacity-90">⏱ {story.readingTimeMin} min de lecture</span>
          </div>
          <h1 className="mb-3 font-display text-4xl uppercase leading-none tracking-wide [text-shadow:0_2px_20px_rgba(0,0,0,0.5)] md:text-6xl">
            {story.title}
          </h1>
          {story.subtitle && (
            <p className="text-lg italic opacity-95 [text-shadow:0_2px_10px_rgba(0,0,0,0.5)] md:text-xl">
              {story.subtitle}
            </p>
          )}
        </div>
        {story.heroImageAttribution && (
          <span className="absolute bottom-2 right-4 text-[11px] italic opacity-60">
            {story.heroImageAttribution}
          </span>
        )}
      </section>

      {/* Body */}
      <div className="article-body mx-auto max-w-[720px] px-6 py-12 md:py-16">
        <ReactMarkdown>{story.content}</ReactMarkdown>
      </div>

      {/* Footer: share + related */}
      <footer className="bg-muted px-6 py-16">
        <div className="mx-auto max-w-7xl">
          <section className="mb-16 text-center">
            <h3 className="mb-4 font-display text-2xl uppercase tracking-wide text-secondary">
              Partager cette histoire
            </h3>
            <ShareButtons url={`/histoires/${story.slug}`} title={story.title} />
          </section>

          {suggestions.length > 0 && (
            <section>
              <h3 className="mb-8 text-center font-display text-3xl uppercase tracking-wide text-secondary">
                À lire aussi
              </h3>
              <div className="grid gap-6 md:grid-cols-3">
                {suggestions.map((s) => (
                  <StoryCard key={s.slug} story={s} />
                ))}
              </div>
            </section>
          )}
        </div>
      </footer>
    </article>
  );
}
