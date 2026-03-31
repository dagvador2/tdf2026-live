import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { StageTypeBadge } from "./StageTypeBadge";
import { ChevronRight, Mountain, Route as RouteIcon } from "lucide-react";

interface StageCardProps {
  id: string;
  number: number;
  name: string;
  type: string;
  date: Date;
  distanceKm: number;
  elevationM: number;
  status: string;
}

export function StageCard({
  id,
  number,
  name,
  type,
  date,
  distanceKm,
  elevationM,
  status,
}: StageCardProps) {
  const dateStr = new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(date);

  const isLive = status === "live";
  const isFinished = status === "finished";

  return (
    <Link href={`/etapes/${id}`}>
      <Card className="group overflow-hidden transition-all hover:shadow-lg">
        <CardContent className="flex items-center gap-4 p-4">
          {/* Stage number */}
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-secondary font-display text-xl text-primary">
            {number}
          </div>

          {/* Info */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="truncate font-display text-lg uppercase text-secondary">
                {name}
              </h3>
              {isLive && (
                <span className="inline-flex items-center gap-1 rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-bold uppercase text-white">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
                  Live
                </span>
              )}
              {isFinished && (
                <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-bold uppercase text-green-800">
                  Terminée
                </span>
              )}
            </div>
            <p className="text-sm capitalize text-muted-foreground">{dateStr}</p>
            <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
              <StageTypeBadge type={type} />
              <span className="flex items-center gap-1">
                <RouteIcon className="h-3 w-3" />
                {distanceKm} km
              </span>
              <span className="flex items-center gap-1">
                <Mountain className="h-3 w-3" />
                {elevationM.toLocaleString("fr-FR")} m D+
              </span>
            </div>
          </div>

          <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-1" />
        </CardContent>
      </Card>
    </Link>
  );
}
