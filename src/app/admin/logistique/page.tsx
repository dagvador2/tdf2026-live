import { prisma } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { parseLogistics } from "@/lib/rider/logistics";
import { LogisticsTable } from "./LogisticsTable";

export const dynamic = "force-dynamic";
export const metadata = { title: "Logistique — Admin" };

export default async function AdminLogisticsPage() {
  const riders = await prisma.rider.findMany({
    orderBy: [{ team: { name: "asc" } }, { firstName: "asc" }],
    include: { team: true },
  });

  const rows = riders.map((r) => {
    const l = r.logistics ? parseLogistics(r.logistics) : null;
    return {
      id: r.id,
      firstName: r.firstName,
      nickname: r.nickname,
      team: r.team,
      logistics: l
        ? {
            arrivalMethod: (l.arrivalMethod || null) as
              | "car"
              | "train"
              | "carpool"
              | "other"
              | null,
            arrivalDate: l.arrivalDate || null,
            arrivalTime: l.arrivalTime || null,
            arrivalLocation: l.arrivalLocation || null,
            needsPickup: l.needsPickup,
            departureDate: l.departureDate || null,
            bikeSpaces:
              l.bikeSpaces === "" ? null : parseInt(l.bikeSpaces, 10) || null,
            passengerSpaces:
              l.passengerSpaces === ""
                ? null
                : parseInt(l.passengerSpaces, 10) || null,
            comment: l.comment || null,
          }
        : null,
    };
  });

  // Aggregate stats
  const filled = rows.filter((r) => r.logistics?.arrivalDate).length;
  const needsPickup = rows.filter((r) => r.logistics?.needsPickup).length;
  const totalBikeSpaces = rows.reduce(
    (sum, r) => sum + (r.logistics?.bikeSpaces ?? 0),
    0
  );
  const totalPassengerSpaces = rows.reduce(
    (sum, r) => sum + (r.logistics?.passengerSpaces ?? 0),
    0
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl uppercase">Logistique</h1>
        <p className="text-sm text-muted-foreground">
          Arrivées, départs, covoiturages et besoins de récupération.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard
          label="Renseigné"
          value={`${filled} / ${rows.length}`}
        />
        <StatCard
          label="À récupérer"
          value={needsPickup}
          accent="orange"
        />
        <StatCard
          label="Places vélo dispo"
          value={totalBikeSpaces}
          accent="green"
        />
        <StatCard
          label="Places passager dispo"
          value={totalPassengerSpaces}
          accent="green"
        />
      </div>

      <Card>
        <CardContent className="p-4">
          <LogisticsTable riders={rows} />
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string | number;
  accent?: "orange" | "green";
}) {
  const color =
    accent === "orange"
      ? "text-orange-600"
      : accent === "green"
        ? "text-green-600"
        : "";
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className={`font-mono text-2xl font-bold ${color}`}>{value}</p>
      </CardContent>
    </Card>
  );
}
