import { verifyRiderJWT } from "@/lib/auth/jwt";
import { prisma } from "@/lib/db";
import Link from "next/link";
import { RiderTokenPersist } from "@/components/coureur/RiderTokenPersist";
import { RiderStageMap } from "@/components/coureur/RiderStageMap";
import { Radio, Trophy, User } from "lucide-react";

export default async function RiderPage({
  params,
}: {
  params: { token: string };
}) {
  const result = await verifyRiderJWT(params.token);

  if ("error" in result) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="font-display text-4xl text-destructive">
            {result.error === "expired" ? "Lien expiré" : "Lien invalide"}
          </h1>
          <p className="mt-2 text-muted-foreground">
            {result.error === "expired"
              ? "Ce lien a expiré. Contacte l'organisateur pour en obtenir un nouveau."
              : "Ce lien n'est pas valide. Vérifie que tu as le bon lien."}
          </p>
        </div>
      </main>
    );
  }

  const [rider, nextStage] = await Promise.all([
    prisma.rider.findUnique({
      where: { id: result.riderId },
      include: { team: true },
    }),
    prisma.stage.findFirst({
      where: { status: { in: ["upcoming", "live"] } },
      orderBy: { number: "asc" },
      include: { checkpoints: { orderBy: { order: "asc" } } },
    }),
  ]);

  if (!rider) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <h1 className="font-display text-4xl text-destructive">
          Coureur introuvable
        </h1>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 px-4">
      <RiderTokenPersist token={params.token} />

      <div className="text-center">
        <h1 className="font-display text-5xl">
          Bienvenue {rider.firstName}
        </h1>
        <p className="mt-3 text-lg text-muted-foreground">
          Équipe{" "}
          <span style={{ color: rider.team.color }} className="font-semibold">
            {rider.team.name}
          </span>
        </p>
      </div>

      <div className="grid w-full max-w-sm gap-3">
        <Link
          href={`/coureur/${params.token}/live`}
          className="flex items-center gap-3 rounded-lg border border-border bg-card p-4 transition-colors hover:bg-muted"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary">
            <Radio className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <p className="font-display text-lg uppercase">Mode course</p>
            <p className="text-sm text-muted-foreground">
              Tracking GPS et écarts en direct
            </p>
          </div>
        </Link>

        <Link
          href={`/coureur/${params.token}/classements`}
          className="flex items-center gap-3 rounded-lg border border-border bg-card p-4 transition-colors hover:bg-muted"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary">
            <Trophy className="h-5 w-5 text-secondary-foreground" />
          </div>
          <div>
            <p className="font-display text-lg uppercase">Mes classements</p>
            <p className="text-sm text-muted-foreground">
              Ta position au général, par équipe, grimpeur
            </p>
          </div>
        </Link>

        <Link
          href={`/coureurs/${rider.slug}`}
          className="flex items-center gap-3 rounded-lg border border-border bg-card p-4 transition-colors hover:bg-muted"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
            <User className="h-5 w-5 text-muted-foreground" />
          </div>
          <div>
            <p className="font-display text-lg uppercase">Mon profil</p>
            <p className="text-sm text-muted-foreground">
              Fiche coureur et fun facts
            </p>
          </div>
        </Link>
      </div>

      {nextStage?.gpxUrl && (
        <div className="w-full max-w-sm">
          <RiderStageMap
            gpxUrl={nextStage.gpxUrl}
            checkpoints={nextStage.checkpoints.map((cp) => ({
              lat: cp.latitude,
              lng: cp.longitude,
              name: cp.name,
              type: cp.type,
              kmFromStart: cp.kmFromStart,
            }))}
            stageName={`Étape ${nextStage.number} — ${nextStage.name}`}
          />
        </div>
      )}
    </main>
  );
}
