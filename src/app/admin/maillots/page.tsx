import { prisma } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import Image from "next/image";
import Link from "next/link";

export const dynamic = "force-dynamic";
export const metadata = { title: "Maillots — Admin" };

const SIZES = ["XS", "S", "M", "L", "XL", "XXL"] as const;

export default async function AdminJerseysPage() {
  const teams = await prisma.team.findMany({
    where: { slug: { not: "sans-equipe" } },
    orderBy: { name: "asc" },
  });

  const riders = await prisma.rider.findMany({
    where: { team: { slug: { not: "sans-equipe" } } },
    orderBy: [{ team: { name: "asc" } }, { firstName: "asc" }],
    include: { team: true },
  });

  const teamBySlug = new Map(teams.map((t) => [t.slug, t]));

  // Lignes de commande : [teamSlug][size] = quantité
  type Counts = Record<string, Record<string, number>>;
  const counts: Counts = {};
  for (const t of teams) counts[t.slug] = {};

  const ridersMissing: typeof riders = [];

  for (const r of riders) {
    if (!r.jerseySize) {
      ridersMissing.push(r);
      continue;
    }
    const size = r.jerseySize;
    // Maillot d'équipe par défaut
    counts[r.team.slug][size] = (counts[r.team.slug][size] ?? 0) + 1;
    // Maillots additionnels
    const extras = (r.extraJerseys as Record<string, number> | null) ?? {};
    for (const [slug, qty] of Object.entries(extras)) {
      if (!counts[slug]) continue;
      counts[slug][size] = (counts[slug][size] ?? 0) + qty;
    }
  }

  const totalsByTeam: Record<string, number> = {};
  for (const slug of Object.keys(counts)) {
    totalsByTeam[slug] = Object.values(counts[slug]).reduce((s, n) => s + n, 0);
  }
  const grandTotal = Object.values(totalsByTeam).reduce((s, n) => s + n, 0);
  const filledCount = riders.length - ridersMissing.length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl uppercase">Maillots</h1>
        <p className="text-sm text-muted-foreground">
          Récap pour la commande TDS Sportswear : maillot d&apos;équipe par défaut + maillots additionnels.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Tailles renseignées" value={`${filledCount} / ${riders.length}`} />
        <StatCard label="Maillots à commander" value={grandTotal} accent="green" />
        <StatCard label="Coureurs sans taille" value={ridersMissing.length} accent={ridersMissing.length > 0 ? "orange" : undefined} />
        <StatCard label="Équipes" value={teams.length} />
      </div>

      {ridersMissing.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <p className="text-sm font-semibold text-orange-600">
              {ridersMissing.length} coureur(s) n&apos;ont pas renseigné leur taille :
            </p>
            <ul className="mt-2 list-disc pl-5 text-sm">
              {ridersMissing.map((r) => (
                <li key={r.id}>
                  <Link href={`/coureurs/${r.slug}`} className="underline hover:text-foreground">
                    {r.firstName}
                  </Link>{" "}
                  — {r.team.name}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-4">
          <h2 className="mb-4 font-display text-lg uppercase">Récap par équipe / taille</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase text-muted-foreground">
                  <th className="px-3 py-2">Équipe</th>
                  {SIZES.map((s) => (
                    <th key={s} className="px-3 py-2 text-center">{s}</th>
                  ))}
                  <th className="px-3 py-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {teams.map((team) => (
                  <tr key={team.slug} className="border-b border-border/50">
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        {team.logoUrl && (
                          <Image src={team.logoUrl} alt={team.name} width={24} height={24} className="h-6 w-6 object-contain" unoptimized />
                        )}
                        <span className="font-medium">{team.name}</span>
                      </div>
                    </td>
                    {SIZES.map((s) => (
                      <td key={s} className="px-3 py-2 text-center font-mono tabular-nums">
                        {counts[team.slug][s] || ""}
                      </td>
                    ))}
                    <td className="px-3 py-2 text-right font-mono font-bold tabular-nums">
                      {totalsByTeam[team.slug]}
                    </td>
                  </tr>
                ))}
                <tr className="border-t-2 border-border bg-muted/30 font-bold">
                  <td className="px-3 py-2">TOTAL</td>
                  {SIZES.map((s) => {
                    const total = teams.reduce((sum, t) => sum + (counts[t.slug][s] || 0), 0);
                    return (
                      <td key={s} className="px-3 py-2 text-center font-mono tabular-nums">
                        {total || ""}
                      </td>
                    );
                  })}
                  <td className="px-3 py-2 text-right font-mono tabular-nums">{grandTotal}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <h2 className="mb-4 font-display text-lg uppercase">Détail par coureur</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase text-muted-foreground">
                  <th className="px-3 py-2">Coureur</th>
                  <th className="px-3 py-2">Équipe</th>
                  <th className="px-3 py-2 text-center">Taille</th>
                  <th className="px-3 py-2">Maillots commandés</th>
                </tr>
              </thead>
              <tbody>
                {riders.map((r) => {
                  const extras = (r.extraJerseys as Record<string, number> | null) ?? {};
                  const items: { team: string; qty: number; isOwn: boolean }[] = [
                    { team: r.team.name, qty: 1, isOwn: true },
                  ];
                  for (const [slug, qty] of Object.entries(extras)) {
                    const t = teamBySlug.get(slug);
                    if (t && qty > 0) items.push({ team: t.name, qty, isOwn: false });
                  }
                  return (
                    <tr key={r.id} className="border-b border-border/50">
                      <td className="px-3 py-2 font-medium">{r.firstName}</td>
                      <td className="px-3 py-2 text-muted-foreground">{r.team.name}</td>
                      <td className="px-3 py-2 text-center font-mono">{r.jerseySize ?? "—"}</td>
                      <td className="px-3 py-2">
                        {items.map((it, idx) => (
                          <span key={idx} className="mr-2 inline-block">
                            {it.qty > 1 ? `${it.qty}× ` : ""}
                            <span className={it.isOwn ? "" : "font-semibold text-primary"}>{it.team}</span>
                            {idx < items.length - 1 ? "," : ""}
                          </span>
                        ))}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
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
    accent === "orange" ? "text-orange-600" : accent === "green" ? "text-green-600" : "";
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className={`font-mono text-2xl font-bold ${color}`}>{value}</p>
      </CardContent>
    </Card>
  );
}
