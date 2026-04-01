"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

interface CheckpointData {
  id?: string;
  name: string;
  type: string;
  latitude: number;
  longitude: number;
  radiusM: number;
  order: number;
  kmFromStart: number;
  elevation: number | null;
}

interface CheckpointFormProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: CheckpointData) => Promise<void>;
  onDelete?: () => Promise<void>;
  initialData?: CheckpointData | null;
}

export function CheckpointForm({
  open,
  onClose,
  onSave,
  onDelete,
  initialData,
}: CheckpointFormProps) {
  const [form, setForm] = useState<CheckpointData>(
    initialData ?? {
      name: "",
      type: "col",
      latitude: 0,
      longitude: 0,
      radiusM: 50,
      order: 1,
      kmFromStart: 0,
      elevation: null,
    }
  );
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (initialData) setForm(initialData);
  }, [initialData]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await onSave(form);
    setSaving(false);
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {initialData?.id ? "Modifier le checkpoint" : "Nouveau checkpoint"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Nom</label>
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Type</label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={form.type}
                onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
              >
                <option value="start">Départ</option>
                <option value="col">Col</option>
                <option value="sprint">Sprint</option>
                <option value="finish">Arrivée</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Latitude</label>
              <Input
                type="number"
                step="any"
                value={form.latitude}
                onChange={(e) => setForm((f) => ({ ...f, latitude: parseFloat(e.target.value) || 0 }))}
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Longitude</label>
              <Input
                type="number"
                step="any"
                value={form.longitude}
                onChange={(e) => setForm((f) => ({ ...f, longitude: parseFloat(e.target.value) || 0 }))}
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Rayon (m)</label>
              <Input
                type="number"
                min={10}
                max={500}
                value={form.radiusM}
                onChange={(e) => setForm((f) => ({ ...f, radiusM: parseInt(e.target.value) || 50 }))}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Ordre</label>
              <Input
                type="number"
                min={1}
                value={form.order}
                onChange={(e) => setForm((f) => ({ ...f, order: parseInt(e.target.value) || 1 }))}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Km depuis départ</label>
              <Input
                type="number"
                step="0.1"
                value={form.kmFromStart}
                onChange={(e) => setForm((f) => ({ ...f, kmFromStart: parseFloat(e.target.value) || 0 }))}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Altitude (m)</label>
              <Input
                type="number"
                value={form.elevation ?? ""}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    elevation: e.target.value ? parseInt(e.target.value) : null,
                  }))
                }
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            {onDelete && initialData?.id && (
              <Button
                type="button"
                variant="destructive"
                onClick={async () => {
                  await onDelete();
                  onClose();
                }}
              >
                Supprimer
              </Button>
            )}
            <Button type="button" variant="outline" onClick={onClose}>
              Annuler
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "..." : "Enregistrer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
