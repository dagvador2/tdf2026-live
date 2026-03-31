import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ENTRY_STATUS_LABELS } from "@/lib/utils/constants";

interface RegisteredRider {
  id: string;
  status: string;
  rider: {
    firstName: string;
    slug: string;
    team: {
      name: string;
      color: string;
    };
  };
}

export function RegisteredRiders({ entries }: { entries: RegisteredRider[] }) {
  if (entries.length === 0) {
    return (
      <Card>
        <CardContent className="p-5 text-center text-sm text-muted-foreground">
          Aucun coureur inscrit pour le moment
        </CardContent>
      </Card>
    );
  }

  // Group by team
  const byTeam = entries.reduce<Record<string, RegisteredRider[]>>((acc, entry) => {
    const teamName = entry.rider.team.name;
    if (!acc[teamName]) acc[teamName] = [];
    acc[teamName].push(entry);
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      <h2 className="font-display text-2xl uppercase text-secondary">
        Coureurs inscrits ({entries.length})
      </h2>
      {Object.entries(byTeam).map(([teamName, teamEntries]) => (
        <Card key={teamName}>
          <CardContent className="p-4">
            <div className="mb-3 flex items-center gap-2">
              <div
                className="h-3 w-3 rounded-full"
                style={{ backgroundColor: teamEntries[0].rider.team.color }}
              />
              <h3 className="font-display text-sm uppercase text-secondary">
                {teamName}
              </h3>
              <Badge variant="outline" className="text-xs">
                {teamEntries.length}
              </Badge>
            </div>
            <div className="flex flex-wrap gap-2">
              {teamEntries.map((entry) => (
                <Link
                  key={entry.id}
                  href={`/coureurs/${entry.rider.slug}`}
                  className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm transition-colors hover:bg-muted"
                >
                  <span>{entry.rider.firstName}</span>
                  {entry.status !== "registered" && (
                    <Badge variant="secondary" className="text-[10px]">
                      {ENTRY_STATUS_LABELS[entry.status] || entry.status}
                    </Badge>
                  )}
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
