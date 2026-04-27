import Link from "next/link";
import { CategoryBadge } from "@/components/stories/CategoryBadge";
import {
  aggregateKPIs,
  getDailyTimeseries,
  getPerUserReads,
  getStoryStats,
  PERIOD_LABEL,
  type Period,
} from "@/lib/stories/stats";
import { ViewsChart } from "@/components/admin/ViewsChart";

export const dynamic = "force-dynamic";

const VALID_PERIODS: Period[] = ["24h", "7d", "30d", "all"];

function formatPct(n: number): string {
  return `${(n * 100).toFixed(0)}%`;
}

function formatDate(d: Date | null): string {
  if (!d) return "—";
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" });
}

export default async function AdminStoryStatsPage({
  searchParams,
}: {
  searchParams: { period?: string };
}) {
  const period: Period = VALID_PERIODS.includes(searchParams.period as Period)
    ? (searchParams.period as Period)
    : "7d";

  const [rows, daily, perUser] = await Promise.all([
    getStoryStats(period),
    getDailyTimeseries(period),
    getPerUserReads(period),
  ]);
  const kpis = aggregateKPIs(rows);

  // Pour le tableau : on filtre les histoires sans aucun event (sauf en mode "all")
  const tableRows = rows.filter((r) => period === "all" || r.views > 0 || r.reads > 0 || r.shares > 0);

  return (
    <div>
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <Link href="/admin/histoires" className="text-xs text-muted-foreground hover:underline">
            ← Histoires
          </Link>
          <h1 className="mt-1 font-display text-3xl uppercase tracking-wide">Stats de lecture</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Période : <strong>{PERIOD_LABEL[period]}</strong>. Les compteurs mesurent les events
            envoyés depuis /histoires.
          </p>
        </div>
        <nav className="flex items-center gap-1 rounded-full border border-border bg-card p-1 text-xs font-semibold">
          {VALID_PERIODS.map((p) => (
            <Link
              key={p}
              href={`/admin/histoires/stats?period=${p}`}
              className={`rounded-full px-3 py-1 transition-colors ${
                period === p
                  ? "bg-secondary text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {PERIOD_LABEL[p]}
            </Link>
          ))}
        </nav>
      </header>

      {/* KPI cards */}
      <section className="mb-8 grid grid-cols-2 gap-3 md:grid-cols-4">
        <KpiCard label="Vues" value={kpis.totalViews} />
        <KpiCard label="Lectures complètes" value={kpis.totalReads} />
        <KpiCard label="Taux de complétion" value={formatPct(kpis.completionRate)} />
        <KpiCard label="Partages" value={kpis.totalShares} />
      </section>

      {/* Daily chart */}
      <section className="mb-8 rounded-lg border border-border bg-card p-4">
        <h2 className="mb-3 font-display text-base uppercase tracking-wide">
          Vues par jour
        </h2>
        <ViewsChart data={daily} />
      </section>

      {/* Per-story table */}
      <section className="mb-10 overflow-hidden rounded-lg border border-border bg-card">
        <div className="border-b border-border px-4 py-3">
          <h2 className="font-display text-base uppercase tracking-wide">Par histoire</h2>
        </div>
        {tableRows.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">
            Aucun event sur cette période.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted text-left text-[11px] uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-3 py-2">Histoire</th>
                <th className="px-3 py-2 text-right">Vues</th>
                <th className="px-3 py-2 text-right">Uniques</th>
                <th className="px-3 py-2 text-right">Lues</th>
                <th className="px-3 py-2 text-right">% complétion</th>
                <th className="px-3 py-2 text-right">Partages</th>
                <th className="px-3 py-2">Publiée</th>
              </tr>
            </thead>
            <tbody>
              {tableRows.map((r) => {
                const completion = r.views > 0 ? r.reads / r.views : 0;
                return (
                  <tr key={r.storyId} className="border-t border-border">
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <CategoryBadge category={r.category} />
                        <Link
                          href={`/histoires/${r.slug}`}
                          target="_blank"
                          className="font-semibold hover:underline"
                        >
                          {r.title}
                        </Link>
                      </div>
                    </td>
                    <td className="px-3 py-2 text-right font-mono">{r.views}</td>
                    <td className="px-3 py-2 text-right font-mono text-muted-foreground">
                      {r.uniqueViews}
                    </td>
                    <td className="px-3 py-2 text-right font-mono">{r.reads}</td>
                    <td className="px-3 py-2 text-right font-mono">
                      {r.views > 0 ? formatPct(completion) : "—"}
                    </td>
                    <td className="px-3 py-2 text-right font-mono">{r.shares}</td>
                    <td className="px-3 py-2 font-mono text-[11px] text-muted-foreground">
                      {formatDate(r.publishedAt)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>

      {/* Per-user table */}
      <section className="overflow-hidden rounded-lg border border-border bg-card">
        <div className="border-b border-border px-4 py-3">
          <h2 className="font-display text-base uppercase tracking-wide">Par utilisateur</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Histoires lues (event &quot;read&quot;) par les utilisateurs connectés sur la période.
          </p>
        </div>
        {perUser.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">
            Aucun utilisateur connecté n&apos;a lu d&apos;histoire sur cette période.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted text-left text-[11px] uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-3 py-2">Utilisateur</th>
                <th className="px-3 py-2 text-right">Lues</th>
                <th className="px-3 py-2">Slugs</th>
              </tr>
            </thead>
            <tbody>
              {perUser.map((u) => (
                <tr key={u.userId} className="border-t border-border align-top">
                  <td className="px-3 py-2">
                    <div className="font-semibold">{u.riderName || u.name || "(sans nom)"}</div>
                    <div className="text-[11px] text-muted-foreground">{u.email ?? "—"}</div>
                  </td>
                  <td className="px-3 py-2 text-right font-mono">{u.readCount}</td>
                  <td className="px-3 py-2 text-[11px] text-muted-foreground">
                    {u.readSlugs.join(", ")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}

function KpiCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 font-display text-3xl">{value}</div>
    </div>
  );
}
