import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Flag, ClipboardList } from "lucide-react";

interface DashboardStatsProps {
  teamCount: number;
  riderCount: number;
  stageCount: number;
  entryCount: number;
  liveStage: string | null;
}

export function DashboardStats({
  teamCount,
  riderCount,
  stageCount,
  entryCount,
  liveStage,
}: DashboardStatsProps) {
  const stats = [
    { label: "Équipes", value: teamCount, icon: Users },
    { label: "Coureurs", value: riderCount, icon: Users },
    { label: "Étapes", value: stageCount, icon: Flag },
    { label: "Inscriptions", value: entryCount, icon: ClipboardList },
  ];

  return (
    <div className="space-y-6">
      {liveStage && (
        <div className="rounded-lg border-2 border-primary bg-primary/10 p-4">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
            <span className="font-display text-lg uppercase text-primary">
              Étape en cours
            </span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{liveStage}</p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.label}
              </CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="font-mono text-2xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
