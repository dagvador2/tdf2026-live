"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";

interface Rider {
  id: string;
  firstName: string;
  team: { id: string; name: string; color: string };
}

interface Stage {
  id: string;
  number: number;
  name: string;
}

interface Entry {
  riderId: string;
  stageId: string;
}

interface EntryMatrixProps {
  riders: Rider[];
  stages: Stage[];
  entries: Entry[];
  onToggle: (riderId: string, stageId: string, enrolled: boolean) => Promise<void>;
}

export function EntryMatrix({ riders, stages, entries, onToggle }: EntryMatrixProps) {
  const [teamFilter, setTeamFilter] = useState<string | "all">("all");
  const [updating, setUpdating] = useState<string | null>(null);

  const entrySet = new Set(entries.map((e) => `${e.riderId}-${e.stageId}`));

  const teams = Array.from(
    new Map(riders.map((r) => [r.team.id, r.team])).values()
  );

  const filteredRiders =
    teamFilter === "all"
      ? riders
      : riders.filter((r) => r.team.id === teamFilter);

  // Count per stage
  const stageCount = stages.map((s) => ({
    ...s,
    count: entries.filter((e) => e.stageId === s.id).length,
  }));

  async function handleToggle(riderId: string, stageId: string) {
    const key = `${riderId}-${stageId}`;
    setUpdating(key);
    const enrolled = entrySet.has(key);
    await onToggle(riderId, stageId, enrolled);
    setUpdating(null);
  }

  return (
    <div className="space-y-4">
      {/* Team filter */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Filtrer :</span>
        <button
          onClick={() => setTeamFilter("all")}
          className={`rounded px-2 py-1 text-xs font-medium ${
            teamFilter === "all"
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground"
          }`}
        >
          Toutes
        </button>
        {teams.map((t) => (
          <button
            key={t.id}
            onClick={() => setTeamFilter(t.id)}
            className="rounded px-2 py-1 text-xs font-medium"
            style={{
              backgroundColor: teamFilter === t.id ? t.color : undefined,
              color: teamFilter === t.id ? "#fff" : t.color,
              border: `1px solid ${t.color}`,
            }}
          >
            {t.name.split(" ")[0]}
          </button>
        ))}
      </div>

      {/* Matrix table */}
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-3 py-2 text-left font-medium">Coureur</th>
              <th className="px-3 py-2 text-left font-medium">Équipe</th>
              {stageCount.map((s) => (
                <th key={s.id} className="px-3 py-2 text-center font-medium">
                  <div>É{s.number}</div>
                  <Badge variant="secondary" className="text-xs">
                    {s.count}
                  </Badge>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredRiders.map((rider) => (
              <tr key={rider.id} className="border-b hover:bg-muted/30">
                <td className="px-3 py-2 font-medium">{rider.firstName}</td>
                <td className="px-3 py-2">
                  <span
                    className="inline-block h-3 w-3 rounded-full"
                    style={{ backgroundColor: rider.team.color }}
                  />
                </td>
                {stages.map((stage) => {
                  const key = `${rider.id}-${stage.id}`;
                  const enrolled = entrySet.has(key);
                  const isUpdating = updating === key;

                  return (
                    <td key={stage.id} className="px-3 py-2 text-center">
                      <input
                        type="checkbox"
                        checked={enrolled}
                        disabled={isUpdating}
                        onChange={() => handleToggle(rider.id, stage.id)}
                        className="h-4 w-4 cursor-pointer accent-primary"
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
