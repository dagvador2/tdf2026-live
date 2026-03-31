import { Badge } from "@/components/ui/badge";
import { STAGE_TYPE_LABELS } from "@/lib/utils/constants";
import { Mountain, Clock, Route } from "lucide-react";

const STAGE_TYPE_ICONS: Record<string, typeof Mountain> = {
  road: Route,
  team_tt: Clock,
  individual_tt: Clock,
  mountain: Mountain,
};

const STAGE_TYPE_COLORS: Record<string, string> = {
  road: "bg-blue-100 text-blue-800",
  team_tt: "bg-purple-100 text-purple-800",
  individual_tt: "bg-orange-100 text-orange-800",
  mountain: "bg-green-100 text-green-800",
};

export function StageTypeBadge({ type }: { type: string }) {
  const Icon = STAGE_TYPE_ICONS[type] || Route;
  const colors = STAGE_TYPE_COLORS[type] || "bg-gray-100 text-gray-800";

  return (
    <Badge variant="secondary" className={`gap-1 ${colors}`}>
      <Icon className="h-3 w-3" />
      {STAGE_TYPE_LABELS[type] || type}
    </Badge>
  );
}
