"use client";

import { useEffect, useState, useCallback } from "react";
import { EntryMatrix } from "@/components/admin/entries/EntryMatrix";

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

export default function AdminEntriesPage() {
  const [riders, setRiders] = useState<Rider[]>([]);
  const [stages, setStages] = useState<Stage[]>([]);
  const [entries, setEntries] = useState<Entry[]>([]);

  const loadData = useCallback(async () => {
    const [ridersRes, stagesRes, entriesRes] = await Promise.all([
      fetch("/api/admin/riders"),
      fetch("/api/admin/stages"),
      fetch("/api/admin/entries"),
    ]);

    if (ridersRes.ok) {
      const data = await ridersRes.json();
      setRiders(
        data.map((r: Rider) => ({
          id: r.id,
          firstName: r.firstName,
          team: r.team,
        }))
      );
    }
    if (stagesRes.ok) {
      const data = await stagesRes.json();
      setStages(
        data.map((s: Stage & { _count?: unknown }) => ({
          id: s.id,
          number: s.number,
          name: s.name,
        }))
      );
    }
    if (entriesRes.ok) setEntries(await entriesRes.json());
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleToggle(
    riderId: string,
    stageId: string,
    enrolled: boolean
  ) {
    await fetch("/api/admin/entries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        riderId,
        stageId,
        action: enrolled ? "remove" : "add",
      }),
    });
    await loadData();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl uppercase">Inscriptions</h1>
        <p className="text-sm text-muted-foreground">
          Matrice coureurs × étapes
        </p>
      </div>

      <EntryMatrix
        riders={riders}
        stages={stages}
        entries={entries}
        onToggle={handleToggle}
      />
    </div>
  );
}
