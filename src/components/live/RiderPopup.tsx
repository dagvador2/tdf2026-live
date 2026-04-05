import { Badge } from "@/components/ui/badge";
import { formatTime, formatSpeed } from "@/lib/utils/formatters";
import type { RiderPosition } from "@/types";

interface RiderPopupProps {
  rider: RiderPosition;
  onClose: () => void;
}

export function RiderPopup({ rider, onClose }: RiderPopupProps) {
  return (
    <div className="absolute bottom-20 left-1/2 z-50 w-72 -translate-x-1/2 rounded-lg border border-border bg-card p-4 shadow-xl md:bottom-4 md:left-4 md:translate-x-0">
      <button
        onClick={onClose}
        className="absolute right-2 top-2 text-muted-foreground hover:text-foreground"
      >
        ×
      </button>

      <div className="flex items-center gap-3">
        <div
          className="flex h-10 w-10 items-center justify-center rounded-full font-display text-sm text-white"
          style={{ backgroundColor: rider.teamColor }}
        >
          {rider.firstName.charAt(0)}
        </div>
        <div>
          <p className="font-display text-lg uppercase text-secondary">
            {rider.firstName}
          </p>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <div>
          <p className="text-xs text-muted-foreground">Écart au leader</p>
          <p className="font-mono text-lg font-bold text-primary">
            {formatTime(rider.timeGapToLeader)}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Vitesse</p>
          <p className="font-mono text-lg font-bold">
            {rider.speed !== null ? formatSpeed(rider.speed) : "—"}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Distance</p>
          <p className="font-mono text-sm">
            {(rider.distanceFromStart / 1000).toFixed(1)} km
          </p>
        </div>
      </div>

      {(rider.riderAhead || rider.riderBehind) && (
        <div className="mt-3 flex gap-2">
          {rider.riderAhead && (
            <Badge variant="outline" className="text-xs">
              ↑ {rider.riderAhead.firstName} {formatTime(rider.riderAhead.gap)}
            </Badge>
          )}
          {rider.riderBehind && (
            <Badge variant="outline" className="text-xs">
              ↓ {rider.riderBehind.firstName} {formatTime(rider.riderBehind.gap)}
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}
