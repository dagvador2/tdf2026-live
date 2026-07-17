"use client";

import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Minus, Plus } from "lucide-react";

interface PastisAdminRow {
  riderId: string;
  riderName: string;
  teamId: string;
  teamName: string;
  teamColor: string;
  count: number;
}

interface TeamGroup {
  teamId: string;
  teamName: string;
  teamColor: string;
  riders: PastisAdminRow[];
}

export function PastisAdminBoard({ rows }: { rows: PastisAdminRow[] }) {
  const [counts, setCounts] = useState<Record<string, number>>(() =>
    Object.fromEntries(rows.map((r) => [r.riderId, r.count]))
  );

  // Regroupe les coureurs par équipe (rows déjà triées équipe puis prénom)
  const teams = useMemo<TeamGroup[]>(() => {
    const map = new Map<string, TeamGroup>();
    for (const r of rows) {
      if (!map.has(r.teamId)) {
        map.set(r.teamId, {
          teamId: r.teamId,
          teamName: r.teamName,
          teamColor: r.teamColor,
          riders: [],
        });
      }
      map.get(r.teamId)!.riders.push(r);
    }
    return Array.from(map.values());
  }, [rows]);

  const grandTotal = Object.values(counts).reduce((a, b) => a + b, 0);

  const patch = (riderId: string, fn: (c: number) => number) =>
    setCounts((prev) => ({ ...prev, [riderId]: fn(prev[riderId] ?? 0) }));

  async function add(riderId: string, quantity = 1) {
    patch(riderId, (c) => c + quantity); // optimiste
    try {
      const res = await fetch("/api/pastis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ riderId, quantity }),
      });
      if (res.ok) {
        const data = (await res.json()) as { riderCount: number };
        patch(riderId, () => data.riderCount);
      } else {
        patch(riderId, (c) => c - quantity);
      }
    } catch {
      patch(riderId, (c) => c - quantity);
    }
  }

  async function remove(riderId: string) {
    if ((counts[riderId] ?? 0) <= 0) return;
    patch(riderId, (c) => Math.max(0, c - 1)); // optimiste
    try {
      const res = await fetch("/api/pastis", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ riderId }),
      });
      if (res.ok) {
        const data = (await res.json()) as { riderCount: number };
        patch(riderId, () => data.riderCount);
      } else {
        patch(riderId, (c) => c + 1);
      }
    } catch {
      patch(riderId, (c) => c + 1);
    }
  }

  return (
    <div className="space-y-6">
      {/* Total général */}
      <Card className="border-primary/40 bg-primary/10">
        <CardContent className="flex items-center justify-center gap-3 p-4 text-center">
          <span className="text-3xl">🥃</span>
          <span className="font-display text-3xl text-secondary dark:text-primary">
            {grandTotal}
          </span>
          <span className="text-xs uppercase tracking-wide text-muted-foreground">
            pastis au total
          </span>
        </CardContent>
      </Card>

      {teams.map((team) => {
        const teamTotal = team.riders.reduce(
          (a, r) => a + (counts[r.riderId] ?? 0),
          0
        );
        return (
          <div key={team.teamId}>
            <div className="mb-2 flex items-center gap-2">
              <span
                className="h-4 w-4 rounded-full"
                style={{ backgroundColor: team.teamColor }}
              />
              <h2 className="font-display text-sm uppercase tracking-wide">
                {team.teamName}
              </h2>
              <span className="ml-auto font-mono text-sm text-muted-foreground">
                {teamTotal} 🥃
              </span>
            </div>
            <Card>
              <CardContent className="divide-y divide-border p-0">
                {team.riders.map((r) => (
                  <div
                    key={r.riderId}
                    className="flex items-center gap-3 px-4 py-2.5"
                  >
                    <span className="flex-1 truncate font-medium">
                      {r.riderName}
                    </span>
                    <span className="w-10 text-right font-mono text-lg tabular-nums">
                      {counts[r.riderId] ?? 0}
                    </span>
                    <button
                      type="button"
                      onClick={() => remove(r.riderId)}
                      disabled={(counts[r.riderId] ?? 0) <= 0}
                      className="flex h-8 w-8 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:bg-muted disabled:opacity-30"
                      aria-label={`Retirer un pastis à ${r.riderName}`}
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => add(r.riderId)}
                      className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-secondary transition-transform active:scale-90"
                      aria-label={`Ajouter un pastis à ${r.riderName}`}
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => add(r.riderId, 5)}
                      className="rounded-full border border-primary px-2.5 py-1 font-mono text-xs text-secondary transition-colors hover:bg-primary/20 dark:text-primary"
                      aria-label={`Ajouter 5 pastis à ${r.riderName}`}
                    >
                      +5
                    </button>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        );
      })}
    </div>
  );
}
