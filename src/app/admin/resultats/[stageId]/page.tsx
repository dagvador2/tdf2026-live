import { prisma } from "@/lib/db";
import { StageResultsEditor } from "@/components/admin/results/StageResultsEditor";
import { notFound } from "next/navigation";
import Link from "next/link";

export default async function AdminStageResultsPage({
  params,
}: {
  params: { stageId: string };
}) {
  const stage = await prisma.stage.findUnique({
    where: { id: params.stageId },
    include: {
      checkpoints: { orderBy: { order: "asc" } },
      entries: {
        include: {
          rider: { select: { firstName: true } },
        },
      },
    },
  });

  if (!stage) notFound();

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <Link
        href="/admin/resultats"
        className="mb-4 inline-block text-sm text-blue-600 hover:underline"
      >
        &larr; Retour aux étapes
      </Link>

      <div className="mb-6">
        <h1 className="text-2xl font-bold">
          Étape {stage.number} — {stage.name}
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          {stage.entries.length} inscrits &middot;{" "}
          {stage.checkpoints.length} checkpoints &middot; Statut :{" "}
          {stage.status}
        </p>
      </div>

      <StageResultsEditor
        stageId={stage.id}
        stageName={`Étape ${stage.number} — ${stage.name}`}
        stageStatus={stage.status}
        entries={stage.entries.map((e) => ({
          id: e.id,
          riderName: e.rider.firstName,
        }))}
        checkpoints={stage.checkpoints.map((cp) => ({
          id: cp.id,
          name: cp.name,
        }))}
      />
    </div>
  );
}
