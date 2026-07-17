import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface PastisIndividualRow {
  rank: number;
  riderId: string;
  riderName: string;
  riderSlug: string;
  teamName: string;
  teamColor: string;
  count: number;
}

interface PastisTeamRow {
  rank: number;
  teamId: string;
  teamName: string;
  teamColor: string;
  count: number;
}

export interface PastisStandingsProps {
  total: number;
  individual: PastisIndividualRow[];
  teams: PastisTeamRow[];
  highlightRiderId?: string;
  highlightTeamId?: string;
}

/** « 🥃 » répété selon le rang du podium, sinon le rang. */
function rankBadge(rank: number): string {
  if (rank === 1) return "🥇";
  if (rank === 2) return "🥈";
  if (rank === 3) return "🥉";
  return String(rank);
}

export function PastisStandings({
  total,
  individual,
  teams,
  highlightRiderId,
  highlightTeamId,
}: PastisStandingsProps) {
  if (individual.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-sm text-muted-foreground">
          Aucun pastis déclaré pour l&apos;instant. Que la fête commence 🥃
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Bandeau total */}
      <Card className="border-primary/40 bg-primary/10">
        <CardContent className="flex items-center justify-center gap-3 p-6 text-center">
          <span className="text-4xl">🥃</span>
          <div>
            <div className="font-display text-4xl leading-none text-secondary dark:text-primary">
              {total}
            </div>
            <div className="mt-1 text-xs uppercase tracking-wide text-muted-foreground">
              pastis descendus depuis le départ
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Classement par équipe */}
      <div>
        <h3 className="mb-2 font-display text-sm uppercase tracking-wide text-muted-foreground">
          La bataille des équipes
        </h3>
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <tbody>
                  {teams.map((t) => (
                    <tr
                      key={t.teamId}
                      className={cn(
                        "border-b border-border last:border-0 hover:bg-muted/30",
                        highlightTeamId === t.teamId && "bg-primary/10 font-bold"
                      )}
                    >
                      <td className="w-12 px-4 py-3 text-center font-display text-sm">
                        {rankBadge(t.rank)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div
                            className="h-4 w-4 rounded-full"
                            style={{ backgroundColor: t.teamColor }}
                          />
                          <span className="font-display uppercase">{t.teamName}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-base text-secondary dark:text-primary">
                        {t.count} 🥃
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Classement individuel */}
      <div>
        <h3 className="mb-2 font-display text-sm uppercase tracking-wide text-muted-foreground">
          Le maillot jaune de l&apos;apéro
        </h3>
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="px-4 py-3 text-left font-display text-xs uppercase tracking-wide text-muted-foreground">
                      #
                    </th>
                    <th className="px-4 py-3 text-left font-display text-xs uppercase tracking-wide text-muted-foreground">
                      Coureur
                    </th>
                    <th className="px-4 py-3 text-left font-display text-xs uppercase tracking-wide text-muted-foreground">
                      Équipe
                    </th>
                    <th className="px-4 py-3 text-right font-display text-xs uppercase tracking-wide text-muted-foreground">
                      Pastis
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {individual.map((s) => (
                    <tr
                      key={s.riderId}
                      className={cn(
                        "border-b border-border last:border-0 hover:bg-muted/30",
                        highlightRiderId === s.riderId && "bg-primary/10 font-bold"
                      )}
                    >
                      <td className="px-4 py-3">
                        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-secondary font-display text-xs text-primary">
                          {rankBadge(s.rank)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/coureurs/${s.riderSlug}`}
                          className="font-medium hover:text-primary"
                        >
                          {s.riderName}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <div
                            className="h-3 w-3 rounded-full"
                            style={{ backgroundColor: s.teamColor }}
                          />
                          <span className="text-xs text-muted-foreground">
                            {s.teamName}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-base text-secondary dark:text-primary">
                        {s.count} 🥃
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
