import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import { ReplayLoader } from "@/components/replay/ReplayLoader";

export default async function ReplayPage({
  params,
}: {
  params: { id: string };
}) {
  const stage = await prisma.stage.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      number: true,
      name: true,
      status: true,
      distanceKm: true,
    },
  });

  if (!stage) notFound();

  if (stage.status !== "finished") {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center">
        <h1 className="text-2xl font-bold">Replay non disponible</h1>
        <p className="mt-2 text-gray-500">
          Le replay sera disponible une fois l&apos;étape terminée.
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen">
      <div className="mx-auto max-w-5xl px-4 py-8">
        <h1 className="mb-2 text-2xl font-bold">
          Replay — Étape {stage.number}
        </h1>
        <p className="mb-6 text-gray-500">{stage.name}</p>

        <ReplayLoader stageId={stage.id} />
      </div>
    </main>
  );
}
