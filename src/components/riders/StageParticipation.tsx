import { Badge } from "@/components/ui/badge";
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

interface StageParticipationProps {
  entries: StageEntry[];
  teamColor: string;
}

export function StageParticipation({ entries, teamColor }: StageParticipationProps) {
  return (
    <div>
      <h2 className="font-display text-2xl uppercase text-secondary md:text-3xl">
        Participations
      </h2>
      {entries.length === 0 ? (
        <p className="mt-6 rounded-2xl border border-border bg-card p-5 text-center text-sm text-muted-foreground">
          Aucune inscription pour le moment
        </p>
      ) : (
        <div className="mt-6 space-y-3">
          {entries.map((entry) => (
            <div
              key={entry.id}
              className="flex items-center gap-4 rounded-2xl border border-border bg-card p-5"
            >
              <span
                className="font-mono text-3xl font-bold leading-none"
                style={{ color: `${teamColor}55` }}
              >
                {String(entry.stage.number).padStart(2, "0")}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">
                  {entry.stage.name}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {STAGE_TYPE_LABELS[entry.stage.type] || entry.stage.type} · {entry.stage.distanceKm} km
                </p>
              </div>
              <Badge variant="outline" className="shrink-0 text-xs">
                {ENTRY_STATUS_LABELS[entry.status] || entry.status}
              </Badge>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
