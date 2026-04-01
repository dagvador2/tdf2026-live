"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { CheckpointForm } from "./CheckpointForm";

const TYPE_LABELS: Record<string, string> = {
  start: "Départ",
  col: "Col",
  sprint: "Sprint",
  finish: "Arrivée",
};

interface Checkpoint {
  id: string;
  name: string;
  type: string;
  latitude: number;
  longitude: number;
  radiusM: number;
  order: number;
  kmFromStart: number;
  elevation: number | null;
}

interface CheckpointEditorProps {
  stageId: string;
}

export function CheckpointEditor({ stageId }: CheckpointEditorProps) {
  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([]);
  const [editCp, setEditCp] = useState<Checkpoint | null>(null);
  const [showForm, setShowForm] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch(`/api/admin/checkpoints?stageId=${stageId}`);
    if (res.ok) setCheckpoints(await res.json());
  }, [stageId]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleSave(data: {
    id?: string;
    name: string;
    type: string;
    latitude: number;
    longitude: number;
    radiusM: number;
    order: number;
    kmFromStart: number;
    elevation: number | null;
  }) {
    await fetch("/api/admin/checkpoints", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...data, stageId }),
    });
    await load();
    setEditCp(null);
    setShowForm(false);
  }

  async function handleDelete() {
    if (!editCp) return;
    await fetch(`/api/admin/checkpoints?id=${editCp.id}`, { method: "DELETE" });
    await load();
    setEditCp(null);
    setShowForm(false);
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">
          Checkpoints ({checkpoints.length})
        </CardTitle>
        <Button
          size="sm"
          onClick={() => {
            setEditCp(null);
            setShowForm(true);
          }}
        >
          <Plus className="mr-1 h-3 w-3" />
          Ajouter
        </Button>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>#</TableHead>
              <TableHead>Nom</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Km</TableHead>
              <TableHead>Alt.</TableHead>
              <TableHead>Rayon</TableHead>
              <TableHead>Coord.</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {checkpoints.map((cp) => (
              <TableRow key={cp.id}>
                <TableCell className="font-mono">{cp.order}</TableCell>
                <TableCell className="font-medium">{cp.name}</TableCell>
                <TableCell>
                  <Badge variant="outline">{TYPE_LABELS[cp.type] ?? cp.type}</Badge>
                </TableCell>
                <TableCell className="font-mono">{cp.kmFromStart}</TableCell>
                <TableCell className="font-mono">
                  {cp.elevation ? `${cp.elevation} m` : "—"}
                </TableCell>
                <TableCell className="font-mono">{cp.radiusM} m</TableCell>
                <TableCell className="font-mono text-xs">
                  {cp.latitude.toFixed(4)}, {cp.longitude.toFixed(4)}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEditCp(cp);
                        setShowForm(true);
                      }}
                    >
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={async () => {
                        await fetch(`/api/admin/checkpoints?id=${cp.id}`, {
                          method: "DELETE",
                        });
                        await load();
                      }}
                    >
                      <Trash2 className="h-3 w-3 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {checkpoints.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground">
                  Aucun checkpoint. Cliquez sur Ajouter.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>

      {showForm && (
        <CheckpointForm
          open={showForm}
          onClose={() => {
            setShowForm(false);
            setEditCp(null);
          }}
          onSave={handleSave}
          onDelete={editCp ? handleDelete : undefined}
          initialData={
            editCp
              ? {
                  id: editCp.id,
                  name: editCp.name,
                  type: editCp.type,
                  latitude: editCp.latitude,
                  longitude: editCp.longitude,
                  radiusM: editCp.radiusM,
                  order: editCp.order,
                  kmFromStart: editCp.kmFromStart,
                  elevation: editCp.elevation,
                }
              : null
          }
        />
      )}
    </Card>
  );
}
