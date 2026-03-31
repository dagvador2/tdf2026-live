import { StageTypeBadge } from "./StageTypeBadge";
import { Mountain, Route, Calendar, Clock } from "lucide-react";

interface StageInfoProps {
  number: number;
  name: string;
  type: string;
  date: Date;
  distanceKm: number;
  elevationM: number;
  status: string;
}

export function StageInfo({
  number,
  name,
  type,
  date,
  distanceKm,
  elevationM,
  status,
}: StageInfoProps) {
  const dateStr = new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);

  const isLive = status === "live";

  return (
    <div className="rounded-lg border border-border bg-card p-6">
      <div className="flex items-center gap-3">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-secondary font-display text-2xl text-primary">
          {number}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display text-3xl uppercase text-secondary md:text-4xl">
              {name}
            </h1>
            {isLive && (
              <span className="inline-flex items-center gap-1 rounded-full bg-red-500 px-2 py-1 text-xs font-bold uppercase text-white">
                <span className="h-2 w-2 animate-pulse rounded-full bg-white" />
                En direct
              </span>
            )}
          </div>
          <StageTypeBadge type={type} />
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <div>
            <p className="text-xs text-muted-foreground">Date</p>
            <p className="text-sm font-medium capitalize">{dateStr}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Route className="h-4 w-4 text-muted-foreground" />
          <div>
            <p className="text-xs text-muted-foreground">Distance</p>
            <p className="font-mono text-sm font-bold">{distanceKm} km</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Mountain className="h-4 w-4 text-muted-foreground" />
          <div>
            <p className="text-xs text-muted-foreground">Dénivelé</p>
            <p className="font-mono text-sm font-bold">
              {elevationM.toLocaleString("fr-FR")} m D+
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <div>
            <p className="text-xs text-muted-foreground">Statut</p>
            <p className="text-sm font-medium">
              {status === "upcoming" && "À venir"}
              {status === "live" && "En cours"}
              {status === "paused" && "En pause"}
              {status === "finished" && "Terminée"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
