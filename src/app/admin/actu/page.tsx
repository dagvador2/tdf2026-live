import { prisma } from "@/lib/db";
import { FeedManager } from "@/components/admin/feed/FeedManager";

export default async function AdminActuPage() {
  // Get the current live stage, or the most recent one
  const liveStage = await prisma.stage.findFirst({
    where: { status: "live" },
    select: { id: true, number: true, name: true },
  });

  const stage =
    liveStage ??
    (await prisma.stage.findFirst({
      orderBy: { number: "desc" },
      select: { id: true, number: true, name: true },
    }));

  if (!stage) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8">
        <h1 className="text-2xl font-bold">Fil d&apos;actualité</h1>
        <p className="mt-4 text-gray-500">Aucune étape configurée.</p>
      </div>
    );
  }

  // For now, use a static admin ID — in production this comes from the session
  const authorId = "admin";

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Fil d&apos;actualité</h1>
        <p className="mt-1 text-sm text-gray-500">
          Étape {stage.number} — {stage.name}
          {liveStage && (
            <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800">
              <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-red-500" />
              EN DIRECT
            </span>
          )}
        </p>
      </div>

      <FeedManager stageId={stage.id} authorId={authorId} />
    </div>
  );
}
