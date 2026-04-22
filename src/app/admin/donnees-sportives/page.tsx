import { prisma } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { SportTable } from "./SportTable";

export const dynamic = "force-dynamic";
export const metadata = { title: "Données sportives — Admin" };

export default async function AdminSportPage() {
  const riders = await prisma.rider.findMany({
    orderBy: [{ team: { name: "asc" } }, { firstName: "asc" }],
    include: { team: true },
  });

  const rows = riders.map((r) => ({
    id: r.id,
    firstName: r.firstName,
    nickname: r.nickname,
    team: r.team,
    weightKg: r.weightKg,
    ftpWatts: r.ftpWatts,
    level: r.level,
  }));

  const total = rows.length;
  const hasWeight = rows.filter((r) => r.weightKg != null).length;
  const hasFtp = rows.filter((r) => r.ftpWatts != null).length;
  const fullyFilled = rows.filter(
    (r) => r.weightKg != null && r.ftpWatts != null
  ).length;

  const wkgValues = rows
    .filter((r) => r.weightKg != null && r.ftpWatts != null)
    .map((r) => r.ftpWatts! / r.weightKg!);
  const avgWkg =
    wkgValues.length > 0
      ? wkgValues.reduce((a, b) => a + b, 0) / wkgValues.length
      : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl uppercase">Données sportives</h1>
        <p className="text-sm text-muted-foreground">
          Poids et FTP des coureurs — visibles uniquement par l&apos;admin.
          Utile pour l&apos;équilibrage des équipes.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Complets" value={`${fullyFilled} / ${total}`} />
        <StatCard label="Avec poids" value={`${hasWeight} / ${total}`} />
        <StatCard label="Avec FTP" value={`${hasFtp} / ${total}`} />
        <StatCard
          label="W/kg moyen"
          value={avgWkg != null ? avgWkg.toFixed(2) : "—"}
          accent="primary"
        />
      </div>

      <Card>
        <CardContent className="p-4">
          <SportTable riders={rows} />
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
  accent?: "primary";
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p
          className={`font-mono text-2xl font-bold ${
            accent === "primary" ? "text-primary" : ""
          }`}
        >
          {value}
        </p>
      </CardContent>
    </Card>
  );
}
