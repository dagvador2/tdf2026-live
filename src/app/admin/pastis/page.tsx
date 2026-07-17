import { prisma } from "@/lib/db";
import { PastisAdminBoard } from "@/components/admin/pastis/PastisAdminBoard";

export const metadata = {
  title: "Pastis — Admin TDF 2026",
};

export const dynamic = "force-dynamic";

export default async function AdminPastisPage() {
  const [riders, grouped] = await Promise.all([
    prisma.rider.findMany({
      include: { team: true },
      orderBy: [{ team: { name: "asc" } }, { firstName: "asc" }],
    }),
    prisma.pastisLog.groupBy({
      by: ["riderId"],
      _sum: { quantity: true },
    }),
  ]);

  const countByRider = new Map(
    grouped.map((g) => [g.riderId, g._sum.quantity ?? 0])
  );

  const rows = riders.map((r) => ({
    riderId: r.id,
    riderName: r.nickname || r.firstName,
    teamId: r.team.id,
    teamName: r.team.name,
    teamColor: r.team.color,
    count: countByRider.get(r.id) ?? 0,
  }));

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="mb-1 font-display text-3xl uppercase">Pastis 🥃</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Validation quotidienne des consos. Ajuste le compteur de chacun avec les
        boutons + / − ; ça alimente le classement « Apéro » et le compteur live.
      </p>
      <PastisAdminBoard rows={rows} />
    </div>
  );
}
