import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { formatTime } from "@/lib/utils/formatters";

interface IndividualStanding {
  rank: number;
  riderId: string;
  riderName: string;
  riderSlug: string;
  teamName: string;
  teamColor: string;
  elapsedMs: number;
  gapMs: number;
  stagesCompleted?: number;
}

export function IndividualStandingsTable({
  standings,
  showStages,
}: {
  standings: IndividualStanding[];
  showStages?: boolean;
}) {
  if (standings.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-sm text-muted-foreground">
          Aucun classement disponible — les résultats apparaîtront après les étapes
        </CardContent>
      </Card>
    );
  }

  return (
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
                  Temps
                </th>
                <th className="px-4 py-3 text-right font-display text-xs uppercase tracking-wide text-muted-foreground">
                  Écart
                </th>
                {showStages && (
                  <th className="px-4 py-3 text-right font-display text-xs uppercase tracking-wide text-muted-foreground">
                    Étapes
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {standings.map((s) => (
                <tr
                  key={s.riderId}
                  className="border-b border-border last:border-0 hover:bg-muted/30"
                >
                  <td className="px-4 py-3">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-secondary font-display text-xs text-primary">
                      {s.rank}
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
                  <td className="px-4 py-3 text-right font-mono text-sm">
                    {formatElapsedMs(s.elapsedMs)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-sm text-muted-foreground">
                    {s.gapMs === 0 ? "—" : formatTime(s.gapMs / 1000)}
                  </td>
                  {showStages && (
                    <td className="px-4 py-3 text-right text-xs text-muted-foreground">
                      {s.stagesCompleted}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

function formatElapsedMs(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}
