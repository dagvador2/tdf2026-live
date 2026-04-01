"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Play, Pause, Square, RotateCcw } from "lucide-react";

interface StageControlsProps {
  stageId: string;
  status: string;
  stageName: string;
  onStatusChange: () => void;
}

const STATUS_LABELS: Record<string, string> = {
  upcoming: "À venir",
  live: "En cours",
  paused: "En pause",
  finished: "Terminée",
};

interface Action {
  label: string;
  newStatus: string;
  icon: React.ReactNode;
  variant: "default" | "secondary" | "destructive";
  confirm: string;
}

function getActions(status: string): Action[] {
  switch (status) {
    case "upcoming":
      return [
        {
          label: "Démarrer",
          newStatus: "live",
          icon: <Play className="mr-1 h-4 w-4" />,
          variant: "default",
          confirm: "Démarrer cette étape ? Le chrono sera lancé.",
        },
      ];
    case "live":
      return [
        {
          label: "Pause",
          newStatus: "paused",
          icon: <Pause className="mr-1 h-4 w-4" />,
          variant: "secondary",
          confirm: "Mettre l'étape en pause ?",
        },
        {
          label: "Terminer",
          newStatus: "finished",
          icon: <Square className="mr-1 h-4 w-4" />,
          variant: "destructive",
          confirm:
            "Terminer cette étape ? Cette action est irréversible.",
        },
      ];
    case "paused":
      return [
        {
          label: "Reprendre",
          newStatus: "live",
          icon: <RotateCcw className="mr-1 h-4 w-4" />,
          variant: "default",
          confirm: "Reprendre l'étape ?",
        },
        {
          label: "Terminer",
          newStatus: "finished",
          icon: <Square className="mr-1 h-4 w-4" />,
          variant: "destructive",
          confirm:
            "Terminer cette étape ? Cette action est irréversible.",
        },
      ];
    default:
      return [];
  }
}

export function StageControls({
  stageId,
  status,
  stageName,
  onStatusChange,
}: StageControlsProps) {
  const [confirmAction, setConfirmAction] = useState<Action | null>(null);
  const [loading, setLoading] = useState(false);

  const actions = getActions(status);

  async function handleConfirm() {
    if (!confirmAction) return;
    setLoading(true);

    await fetch("/api/admin/stages/status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stageId, newStatus: confirmAction.newStatus }),
    });

    setLoading(false);
    setConfirmAction(null);
    onStatusChange();
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-lg">
            Contrôle d&apos;étape
            <Badge
              variant={status === "live" ? "default" : "secondary"}
            >
              {status === "live" && (
                <span className="mr-1 h-2 w-2 animate-pulse rounded-full bg-red-500 inline-block" />
              )}
              {STATUS_LABELS[status]}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {actions.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Cette étape est terminée. Aucune action disponible.
            </p>
          ) : (
            <div className="flex gap-2">
              {actions.map((action) => (
                <Button
                  key={action.newStatus}
                  variant={action.variant}
                  onClick={() => setConfirmAction(action)}
                >
                  {action.icon}
                  {action.label}
                </Button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={!!confirmAction}
        onOpenChange={(v) => !v && setConfirmAction(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmation</DialogTitle>
            <DialogDescription>
              {stageName}
            </DialogDescription>
          </DialogHeader>
          <p className="text-sm">{confirmAction?.confirm}</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmAction(null)}>
              Annuler
            </Button>
            <Button
              variant={confirmAction?.variant}
              onClick={handleConfirm}
              disabled={loading}
            >
              {loading ? "..." : confirmAction?.label}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
