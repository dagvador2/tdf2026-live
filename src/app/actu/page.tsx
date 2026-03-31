import { prisma } from "@/lib/db";
import { FeedList } from "@/components/feed/FeedList";

export const metadata = {
  title: "Fil d'actu — TDF 2026",
  description: "Fil d'actualité en temps réel du Tour de France amateur 2026",
};

export default async function FeedPage({
  searchParams,
}: {
  searchParams: { etape?: string };
}) {
  // Find live stage for SSE connection
  const liveStage = await prisma.stage.findFirst({
    where: { status: "live" },
  });

  // Filter by stage if param provided
  const stageFilter = searchParams.etape
    ? { stageId: searchParams.etape }
    : {};

  const posts = await prisma.livePost.findMany({
    where: stageFilter,
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  // Get stages for filter
  const stages = await prisma.stage.findMany({
    orderBy: { number: "asc" },
    select: { id: true, number: true, name: true },
  });

  const serializedPosts = posts.map((p) => ({
    id: p.id,
    type: p.type,
    content: p.content,
    photoUrl: p.photoUrl,
    pinned: p.pinned,
    createdAt: p.createdAt.toISOString(),
  }));

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-2 font-display text-4xl uppercase text-secondary md:text-5xl">
        Fil d&apos;actu
      </h1>
      <p className="mb-6 text-muted-foreground">
        {liveStage
          ? "Suivez la course en direct — les posts apparaissent en temps réel"
          : "Dernières actualités de la course"}
      </p>

      {/* Stage filter */}
      {stages.length > 0 && (
        <div className="mb-6 flex flex-wrap gap-2">
          <a
            href="/actu"
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              !searchParams.etape
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            Toutes
          </a>
          {stages.map((stage) => (
            <a
              key={stage.id}
              href={`/actu?etape=${stage.id}`}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                searchParams.etape === stage.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              Étape {stage.number}
            </a>
          ))}
        </div>
      )}

      <FeedList
        initialPosts={serializedPosts}
        liveStageId={liveStage?.id ?? null}
      />
    </div>
  );
}
