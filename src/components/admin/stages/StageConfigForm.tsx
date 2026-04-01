"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { STAGE_TYPE_LABELS } from "@/lib/utils/constants";

interface StageConfig {
  id: string;
  number: number;
  name: string;
  type: string;
  distanceKm: number;
  elevationM: number;
  gpxUrl: string | null;
  ttNthRider: number;
  teamTopN: number;
  gcMode: string;
}

interface StageConfigFormProps {
  stage: StageConfig;
  onSave: (data: { ttNthRider: number; teamTopN: number; gcMode: string }) => Promise<void>;
}

export function StageConfigForm({ stage, onSave }: StageConfigFormProps) {
  const [ttNthRider, setTtNthRider] = useState(stage.ttNthRider);
  const [teamTopN, setTeamTopN] = useState(stage.teamTopN);
  const [gcMode, setGcMode] = useState(stage.gcMode);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await onSave({ ttNthRider, teamTopN, gcMode });
    setSaving(false);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Configuration</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-4 grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">Type</span>
            <p className="font-medium">{STAGE_TYPE_LABELS[stage.type] ?? stage.type}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Distance</span>
            <p className="font-medium">{stage.distanceKm} km</p>
          </div>
          <div>
            <span className="text-muted-foreground">Dénivelé</span>
            <p className="font-medium">{stage.elevationM.toLocaleString("fr-FR")} m D+</p>
          </div>
          <div>
            <span className="text-muted-foreground">GPX</span>
            <p className="font-medium">
              {stage.gpxUrl ? "✅ Uploadé" : "❌ Manquant"}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <label className="text-sm font-medium">
                N-ième coureur CLM équipe
              </label>
              <Input
                type="number"
                min={1}
                max={10}
                value={ttNthRider}
                onChange={(e) => setTtNthRider(parseInt(e.target.value) || 3)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Top N classement équipe
              </label>
              <Input
                type="number"
                min={1}
                max={10}
                value={teamTopN}
                onChange={(e) => setTeamTopN(parseInt(e.target.value) || 3)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Mode classement général</label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={gcMode}
                onChange={(e) => setGcMode(e.target.value)}
              >
                <option value="all">Tous classés</option>
                <option value="complete_only">Étapes complètes</option>
                <option value="categories">Catégories</option>
              </select>
            </div>
          </div>
          <Button type="submit" disabled={saving}>
            {saving ? "Enregistrement..." : "Enregistrer la config"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
