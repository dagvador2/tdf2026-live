import { prisma } from "@/lib/db";
import Link from "next/link";

const STATUS_LABELS: Record<string, string> = {
  upcoming: "À venir",
  live: "En cours",
  paused: "En pause",
  finished: "Terminée",
};

export default async function AdminResultatsPage() {
  const stages = await prisma.stage.findMany({
    orderBy: { number: "asc" },
    select: {
      id: true,
      number: true,
      name: true,
      status: true,
      _count: { select: { entries: true } },
    },
  });

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold">Résultats par étape</h1>

      <div className="space-y-3">
        {stages.map((stage) => (
          <Link
            key={stage.id}
            href={`/admin/resultats/${stage.id}`}
            className="flex items-center justify-between rounded-lg border p-4 transition-colors hover:bg-gray-50"
          >
            <div>
              <span className="font-mono text-sm text-gray-500">
                Étape {stage.number}
              </span>
              <h2 className="text-lg font-semibold">{stage.name}</h2>
            </div>
            <div className="text-right">
              <span
                className={`rounded-full px-3 py-1 text-xs font-medium ${
                  stage.status === "finished"
                    ? "bg-green-100 text-green-800"
                    : stage.status === "live"
                      ? "bg-red-100 text-red-800"
                      : "bg-gray-100 text-gray-600"
                }`}
              >
                {STATUS_LABELS[stage.status] ?? stage.status}
              </span>
              <p className="mt-1 text-xs text-gray-500">
                {stage._count.entries} inscrits
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
