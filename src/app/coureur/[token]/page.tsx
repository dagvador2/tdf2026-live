import { verifyRiderJWT } from "@/lib/auth/jwt";
import { prisma } from "@/lib/db";

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

  const rider = await prisma.rider.findUnique({
    where: { id: result.riderId },
    include: { team: true },
  });

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
    <main className="flex min-h-screen items-center justify-center">
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
    </main>
  );
}
