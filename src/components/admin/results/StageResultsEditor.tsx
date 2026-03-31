"use client";

import { useCallback, useEffect, useState } from "react";
import { TimeRecordTable } from "./TimeRecordTable";
import { ManualTimeEntry } from "./ManualTimeEntry";
import { ValidateButton } from "./ValidateButton";

interface StageResultsEditorProps {
  stageId: string;
  stageName: string;
  stageStatus: string;
  entries: Array<{ id: string; riderName: string }>;
  checkpoints: Array<{ id: string; name: string }>;
}

interface RecordRow {
  id: string;
  riderName: string;
  teamName: string;
  teamColor: string;
  checkpointName: string;
  checkpointType: string;
  timestamp: string;
  isManual: boolean;
  entryId: string;
  checkpointId: string;
}

export function StageResultsEditor({
  stageId,
  stageName,
  stageStatus,
  entries,
  checkpoints,
}: StageResultsEditorProps) {
  const [records, setRecords] = useState<RecordRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/results?stageId=${stageId}`);
      const data = await res.json();
      const rows: RecordRow[] = data.records.map(
        (r: {
          id: string;
          timestamp: string;
          isManual: boolean;
          checkpoint: { name: string; type: string };
          entry: {
            id?: string;
            status: string;
            rider: {
              firstName: string;
              team: { name: string; color: string };
            };
          };
        }) => ({
          id: r.id,
          riderName: r.entry.rider.firstName,
          teamName: r.entry.rider.team.name,
          teamColor: r.entry.rider.team.color,
          checkpointName: r.checkpoint.name,
          checkpointType: r.checkpoint.type,
          timestamp: r.timestamp,
          isManual: r.isManual,
          entryId: r.entry.id ?? "",
          checkpointId: r.id,
        })
      );
      setRecords(rows);
    } finally {
      setLoading(false);
    }
  }, [stageId]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  function handleEdit(
    entryId: string,
    checkpointId: string,
    currentTime: string
  ) {
    const newTime = prompt(
      "Nouvelle heure (HH:MM:SS) :",
      new Date(currentTime).toLocaleTimeString("fr-FR")
    );
    if (!newTime) return;

    const today = new Date().toISOString().split("T")[0];
    fetch("/api/admin/results", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "upsert",
        entryId,
        checkpointId,
        timestamp: new Date(`${today}T${newTime}`).toISOString(),
        correctedBy: "admin",
      }),
    }).then(() => fetchRecords());
  }

  if (loading) {
    return <p className="py-8 text-center text-gray-500">Chargement...</p>;
  }

  return (
    <div className="space-y-6">
      <TimeRecordTable records={records} onEdit={handleEdit} />

      <ManualTimeEntry
        stageId={stageId}
        entries={entries}
        checkpoints={checkpoints}
        onSaved={fetchRecords}
      />

      {stageStatus !== "finished" && (
        <div className="flex justify-end">
          <ValidateButton stageId={stageId} stageName={stageName} />
        </div>
      )}
    </div>
  );
}
