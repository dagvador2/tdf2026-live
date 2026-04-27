import Link from "next/link";
import Image from "next/image";
import { categoryMeta } from "@/lib/stories/categories";
import { CategoryBadge } from "./CategoryBadge";

interface StoryCardData {
  slug: string;
  title: string;
  subtitle: string | null;
  year: number;
  category: string;
  excerpt: string;
  readingTimeMin: number;
  heroImageUrl: string | null;
}

export function StoryCard({ story }: { story: StoryCardData }) {
  const meta = categoryMeta(story.category);
  return (
    <Link
      href={`/histoires/${story.slug}`}
      className="group flex flex-col overflow-hidden rounded-xl bg-card shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-lg"
    >
      <div
        className="relative h-48 w-full overflow-hidden"
        style={story.heroImageUrl ? undefined : { background: meta.gradient }}
      >
        {story.heroImageUrl && (
          <Image
            src={story.heroImageUrl}
            alt={story.title}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            sizes="(max-width: 768px) 100vw, 320px"
          />
        )}
        <div className="absolute left-3 top-3">
          <CategoryBadge category={story.category} />
        </div>
      </div>
      <div className="flex flex-1 flex-col p-5">
        <div className="mb-3 flex items-center justify-between text-xs text-muted-foreground">
          <span className="font-mono font-semibold">{story.year}</span>
          <span>⏱ {story.readingTimeMin} min</span>
        </div>
        <h3 className="mb-2 font-display text-xl uppercase leading-tight tracking-wide text-foreground">
          {story.title}
        </h3>
        {story.subtitle && (
          <p className="mb-3 text-sm italic text-muted-foreground">{story.subtitle}</p>
        )}
        <p className="line-clamp-3 flex-1 text-sm leading-relaxed text-foreground/80">
          {story.excerpt}
        </p>
      </div>
    </Link>
  );
}

export function FeaturedStoryCard({ story }: { story: StoryCardData }) {
  const meta = categoryMeta(story.category);
  return (
    <Link
      href={`/histoires/${story.slug}`}
      className="group grid overflow-hidden rounded-xl bg-card shadow-md transition-all duration-300 hover:-translate-y-1 hover:shadow-xl md:grid-cols-[60%_40%]"
    >
      <div
        className="relative min-h-[240px] md:min-h-[420px]"
        style={story.heroImageUrl ? undefined : { background: meta.gradient }}
      >
        {story.heroImageUrl && (
          <Image
            src={story.heroImageUrl}
            alt={story.title}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
            sizes="(max-width: 768px) 100vw, 60vw"
            priority
          />
        )}
        <div className="absolute left-4 top-4 rounded bg-primary px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest text-primary-foreground">
          À la une
        </div>
      </div>
      <div className="flex flex-col justify-center p-6 md:p-10">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <CategoryBadge category={story.category} />
          <span className="font-mono text-sm font-semibold text-muted-foreground">{story.year}</span>
          <span className="text-xs text-muted-foreground">⏱ {story.readingTimeMin} min de lecture</span>
        </div>
        <h2 className="mb-2 font-display text-3xl uppercase leading-[1.05] tracking-wide text-foreground md:text-4xl">
          {story.title}
        </h2>
        {story.subtitle && (
          <p className="mb-4 text-lg italic text-muted-foreground">{story.subtitle}</p>
        )}
        <p className="mb-6 text-base leading-relaxed text-foreground/80">{story.excerpt}</p>
        <span className="self-start border-b-2 border-primary pb-0.5 font-bold text-secondary transition-colors group-hover:text-primary">
          Lire l&apos;histoire →
        </span>
      </div>
    </Link>
  );
}
