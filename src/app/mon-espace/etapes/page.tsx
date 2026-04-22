import { redirect } from "next/navigation";
import Link from "next/link";
import { getSessionRider } from "@/lib/auth/getSessionRider";
import { prisma } from "@/lib/db";
import { BackLink } from "@/components/ui/back-link";
import { Card, CardContent } from "@/components/ui/card";
import { StageToggle } from "./StageToggle";

export const dynamic = "force-dynamic";

const STAGE_TYPE_LABELS: Record<string, string> = {
  road: "Sortie route",
  team_tt: "CLM par équipe",
  individual_tt: "CLM individuel",
  mountain: "Étape de montagne",
};

const STAGE_STATUS_LABELS: Record<string, string> = {
  upcoming: "",
  live: "En cours",
  paused: "En pause",
  finished: "Terminée",
};

export default async function EtapesPage() {
  const result = await getSessionRider();

  if (result.status === "unauthenticated") redirect("/connexion");
  if (result.status === "admin") redirect("/admin");
  if (result.status === "pending") {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8">
        <BackLink href="/mon-espace" />
        <p className="text-sm text-muted-foreground">
          Ton compte n&apos;est pas encore lié à un profil coureur.
        </p>
        <Link href="/mon-espace" className="mt-4 inline-block text-sm underline">
          Retour
        </Link>
      </div>
    );
  }

  const stages = await prisma.stage.findMany({
    orderBy: { number: "asc" },
  });
  const entries = await prisma.stageEntry.findMany({
    where: { riderId: result.rider.id },
    select: { stageId: true },
  });
  const participatingIds = new Set(entries.map((e) => e.stageId));

  const count = participatingIds.size;

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <BackLink href="/mon-espace" />
      <h1 className="mb-1 font-display text-3xl uppercase">Mes étapes</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Tu participes à <strong>{count}</strong> étape{count !== 1 ? "s" : ""}{" "}
        sur 6.
      </p>

      <div className="space-y-3">
        {stages.map((stage) => {
          const participating = participatingIds.has(stage.id);
          const editable = stage.status === "upcoming";
          const statusLabel = STAGE_STATUS_LABELS[stage.status];
          return (
            <Card key={stage.id}>
              <CardContent className="flex items-start justify-between gap-4 p-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-muted-foreground">
                      Étape {stage.number}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(stage.date).toLocaleDateString("fr-FR", {
                        weekday: "short",
                        day: "2-digit",
                        month: "short",
                      })}
                    </span>
                    {statusLabel && (
                      <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] uppercase text-muted-foreground">
                        {statusLabel}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 font-medium">{stage.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {STAGE_TYPE_LABELS[stage.type] ?? stage.type} •{" "}
                    {stage.distanceKm.toFixed(1)} km • {stage.elevationM} m D+
                  </p>
                </div>

                <StageToggle
                  stageId={stage.id}
                  initialParticipating={participating}
                  editable={editable}
                  disabledReason={!editable ? "Verrouillé" : undefined}
                />
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
