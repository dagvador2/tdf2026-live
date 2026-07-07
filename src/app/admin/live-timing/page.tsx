import { prisma } from "@/lib/db";
import { LiveTimingBoard } from "@/components/admin/live-timing/LiveTimingBoard";

export const metadata = {
  title: "Chrono live — Admin TDF 2026",
};

export const dynamic = "force-dynamic";

export default async function AdminLiveTimingPage() {
  const stages = await prisma.stage.findMany({
    orderBy: { number: "asc" },
    select: { id: true, number: true, name: true, type: true, status: true },
  });

  // Étape présélectionnée : celle qui est live, sinon le premier CLM à venir
  const liveStage = stages.find((s) => s.status === "live");
  const nextTT = stages.find(
    (s) =>
      (s.type === "team_tt" || s.type === "individual_tt") &&
      s.status !== "finished"
  );
  const initialStageId = liveStage?.id ?? nextTT?.id ?? stages[0]?.id ?? null;

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="mb-1 font-display text-3xl uppercase">Chrono live</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Saisie des départs et arrivées en direct pendant les CLM. Les temps
        alimentent l&apos;overlay OBS et les classements.
      </p>

      {initialStageId ? (
        <LiveTimingBoard stages={stages} initialStageId={initialStageId} />
      ) : (
        <p className="text-muted-foreground">Aucune étape en base.</p>
      )}
    </div>
  );
}
