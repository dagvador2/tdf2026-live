import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSessionRider } from "@/lib/auth/getSessionRider";
import { isPastisAdmin } from "@/lib/pastis/admin";
import { getRecentPastisDeclarations } from "@/lib/pastis/queries";
import { PastisReviewFeed } from "@/components/pastis/PastisReviewFeed";
import { PastisAdminBoard } from "@/components/admin/pastis/PastisAdminBoard";

export const metadata = {
  title: "Validation pastis — Mon espace",
};

export const dynamic = "force-dynamic";

export default async function AperoValidationPage() {
  const result = await getSessionRider();

  if (result.status === "unauthenticated") redirect("/connexion");
  // Réservé aux validateurs de la liste blanche (les autres ne voient rien)
  if (result.status !== "rider" || !isPastisAdmin(result.rider.email)) {
    notFound();
  }

  const [declarations, riders, grouped] = await Promise.all([
    getRecentPastisDeclarations(),
    prisma.rider.findMany({
      include: { team: true },
      orderBy: [{ team: { name: "asc" } }, { firstName: "asc" }],
    }),
    prisma.pastisLog.groupBy({ by: ["riderId"], _sum: { quantity: true } }),
  ]);

  const countByRider = new Map(
    grouped.map((g) => [g.riderId, g._sum.quantity ?? 0])
  );
  const boardRows = riders.map((r) => ({
    riderId: r.id,
    riderName: r.nickname || r.firstName,
    teamId: r.team.id,
    teamName: r.team.name,
    teamColor: r.team.color,
    count: countByRider.get(r.id) ?? 0,
  }));

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <h1 className="mb-1 font-display text-3xl uppercase">Validation pastis 🥃</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Chaque déclaration compte déjà au classement. Retire celles qui sont
        bidon, ou ajuste les compteurs à la main plus bas.
      </p>

      <section className="mb-8">
        <h2 className="mb-2 font-display text-sm uppercase tracking-wide text-muted-foreground">
          Déclarations récentes
        </h2>
        <PastisReviewFeed initial={declarations} />
      </section>

      <section>
        <h2 className="mb-2 font-display text-sm uppercase tracking-wide text-muted-foreground">
          Ajustement manuel
        </h2>
        <PastisAdminBoard rows={boardRows} />
      </section>
    </div>
  );
}
