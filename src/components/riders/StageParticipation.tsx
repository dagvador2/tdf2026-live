import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { STAGE_TYPE_LABELS, ENTRY_STATUS_LABELS } from "@/lib/utils/constants";

interface StageEntry {
  id: string;
  status: string;
  stage: {
    number: number;
    name: string;
    type: string;
    distanceKm: number;
  };
}

export function StageParticipation({ entries }: { entries: StageEntry[] }) {
  if (entries.length === 0) {
    return (
      <Card>
        <CardContent className="p-5 text-center text-sm text-muted-foreground">
          Aucune inscription pour le moment
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-5">
        <h3 className="mb-4 font-display text-xl uppercase text-secondary">
          Participations
        </h3>
        <div className="space-y-3">
          {entries.map((entry) => (
            <div
              key={entry.id}
              className="flex items-center justify-between rounded-md border border-border px-3 py-2"
            >
              <div>
                <p className="text-sm font-medium">
                  Étape {entry.stage.number} — {entry.stage.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {STAGE_TYPE_LABELS[entry.stage.type] || entry.stage.type} · {entry.stage.distanceKm} km
                </p>
              </div>
              <Badge variant="outline" className="text-xs">
                {ENTRY_STATUS_LABELS[entry.status] || entry.status}
              </Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
