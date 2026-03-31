import { Card, CardContent } from "@/components/ui/card";
import { formatTime } from "@/lib/utils/formatters";

interface TeamStanding {
  rank: number;
  teamName: string;
  teamColor: string;
  elapsedMs: number;
  gapMs: number;
}

export function TeamStandingsTable({ standings }: { standings: TeamStanding[] }) {
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
                  Équipe
                </th>
                <th className="px-4 py-3 text-right font-display text-xs uppercase tracking-wide text-muted-foreground">
                  Temps
                </th>
                <th className="px-4 py-3 text-right font-display text-xs uppercase tracking-wide text-muted-foreground">
                  Écart
                </th>
              </tr>
            </thead>
            <tbody>
              {standings.map((standing) => (
                <tr
                  key={standing.teamName}
                  className="border-b border-border last:border-0 hover:bg-muted/30"
                >
                  <td className="px-4 py-3">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary font-display text-sm text-primary">
                      {standing.rank}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div
                        className="h-4 w-4 rounded-full"
                        style={{ backgroundColor: standing.teamColor }}
                      />
                      <span className="font-display uppercase">
                        {standing.teamName}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-sm">
                    {formatElapsedMs(standing.elapsedMs)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-sm text-muted-foreground">
                    {standing.gapMs === 0 ? "—" : formatTime(standing.gapMs / 1000)}
                  </td>
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
