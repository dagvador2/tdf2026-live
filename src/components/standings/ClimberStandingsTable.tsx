import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Mountain } from "lucide-react";

interface ClimberStanding {
  rank: number;
  riderId: string;
  riderName: string;
  riderSlug: string;
  teamName: string;
  teamColor: string;
  points: number;
}

export function ClimberStandingsTable({ standings, highlightRiderId }: { standings: ClimberStanding[]; highlightRiderId?: string }) {
  if (standings.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-sm text-muted-foreground">
          Aucun classement grimpeur disponible — des points seront attribués aux cols
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
                  <div className="flex items-center justify-end gap-1">
                    <Mountain className="h-3 w-3" />
                    Points
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {standings.map((s) => (
                <tr
                  key={s.riderId}
                  className={cn(
                    "border-b border-border last:border-0 hover:bg-muted/30",
                    highlightRiderId === s.riderId && "bg-primary/10 font-bold"
                  )}
                >
                  <td className="px-4 py-3">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-orange-100 font-display text-xs text-orange-800">
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
                  <td className="px-4 py-3 text-right font-mono text-lg font-bold text-orange-600">
                    {s.points}
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
