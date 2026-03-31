import { StageCard } from "./StageCard";

interface StageData {
  id: string;
  number: number;
  name: string;
  type: string;
  date: Date;
  distanceKm: number;
  elevationM: number;
  status: string;
}

export function StageTimeline({ stages }: { stages: StageData[] }) {
  return (
    <div className="relative flex flex-col gap-4">
      {/* Timeline line */}
      <div className="absolute left-[2.25rem] top-0 hidden h-full w-0.5 bg-border md:block" />

      {stages.map((stage) => (
        <div key={stage.id} className="relative">
          <StageCard {...stage} />
        </div>
      ))}
    </div>
  );
}
