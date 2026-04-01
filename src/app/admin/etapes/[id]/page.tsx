"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { StageConfigForm } from "@/components/admin/stages/StageConfigForm";
import { GPXUpload } from "@/components/admin/stages/GPXUpload";

interface Stage {
  id: string;
  number: number;
  name: string;
  type: string;
  distanceKm: number;
  elevationM: number;
  gpxUrl: string | null;
  status: string;
  ttNthRider: number;
  teamTopN: number;
  gcMode: string;
}

export default function AdminStageDetailPage() {
  const params = useParams();
  const stageId = params.id as string;
  const [stage, setStage] = useState<Stage | null>(null);

  const loadStage = useCallback(async () => {
    const res = await fetch("/api/admin/stages");
    if (res.ok) {
      const stages: Stage[] = await res.json();
      const found = stages.find((s) => s.id === stageId);
      if (found) setStage(found);
    }
  }, [stageId]);

  useEffect(() => {
    loadStage();
  }, [loadStage]);

  async function handleSaveConfig(data: {
    ttNthRider: number;
    teamTopN: number;
    gcMode: string;
  }) {
    await fetch("/api/admin/stages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: stageId, ...data }),
    });
    await loadStage();
  }

  async function handleGPXUploaded(url: string) {
    await fetch("/api/admin/stages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: stageId, gpxUrl: url }),
    });
    await loadStage();
  }

  if (!stage) {
    return <p className="text-muted-foreground">Chargement...</p>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl uppercase">
          Étape {stage.number} — {stage.name}
        </h1>
        <p className="text-sm text-muted-foreground">
          Configuration et fichier GPX
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <StageConfigForm stage={stage} onSave={handleSaveConfig} />
        <GPXUpload currentUrl={stage.gpxUrl} onUploaded={handleGPXUploaded} />
      </div>
    </div>
  );
}
