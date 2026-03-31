import { Mountain, Route, Users, Calendar } from "lucide-react";

interface StatsBarProps {
  riderCount: number;
  stageCount: number;
  totalKm: number;
  totalElevation: number;
}

export function StatsBar({ riderCount, stageCount, totalKm, totalElevation }: StatsBarProps) {
  const stats = [
    { icon: Users, value: riderCount, label: "Coureurs" },
    { icon: Calendar, value: stageCount, label: "Étapes" },
    { icon: Route, value: `${totalKm.toFixed(0)} km`, label: "Distance totale" },
    { icon: Mountain, value: `${totalElevation.toLocaleString("fr-FR")} m`, label: "Dénivelé total" },
  ];

  return (
    <section className="bg-muted py-8">
      <div className="mx-auto grid max-w-7xl grid-cols-2 gap-6 px-4 md:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="flex flex-col items-center text-center">
              <Icon className="mb-2 h-6 w-6 text-primary" />
              <span className="font-mono text-2xl font-bold text-secondary md:text-3xl">
                {stat.value}
              </span>
              <span className="text-sm text-muted-foreground">{stat.label}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
