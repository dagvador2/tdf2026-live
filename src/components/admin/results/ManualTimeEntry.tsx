"use client";

import { useState } from "react";

interface ManualTimeEntryProps {
  stageId: string;
  entries: Array<{ id: string; riderName: string }>;
  checkpoints: Array<{ id: string; name: string }>;
  onSaved: () => void;
}

export function ManualTimeEntry({
  entries,
  checkpoints,
  onSaved,
}: ManualTimeEntryProps) {
  const [entryId, setEntryId] = useState("");
  const [checkpointId, setCheckpointId] = useState("");
  const [time, setTime] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!entryId || !checkpointId || !time) return;

    setSaving(true);
    try {
      const today = new Date().toISOString().split("T")[0];
      const timestamp = new Date(`${today}T${time}`).toISOString();

      await fetch("/api/admin/results", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "upsert",
          entryId,
          checkpointId,
          timestamp,
          correctedBy: "admin",
        }),
      });

      setTime("");
      onSaved();
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-wrap items-end gap-3 rounded-lg border bg-gray-50 p-4"
    >
      <div>
        <label className="block text-xs font-medium text-gray-600">
          Coureur
        </label>
        <select
          value={entryId}
          onChange={(e) => setEntryId(e.target.value)}
          className="mt-1 rounded border px-3 py-2 text-sm"
        >
          <option value="">Choisir...</option>
          {entries.map((en) => (
            <option key={en.id} value={en.id}>
              {en.riderName}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-600">
          Checkpoint
        </label>
        <select
          value={checkpointId}
          onChange={(e) => setCheckpointId(e.target.value)}
          className="mt-1 rounded border px-3 py-2 text-sm"
        >
          <option value="">Choisir...</option>
          {checkpoints.map((cp) => (
            <option key={cp.id} value={cp.id}>
              {cp.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-600">
          Heure (HH:MM:SS)
        </label>
        <input
          type="time"
          step="1"
          value={time}
          onChange={(e) => setTime(e.target.value)}
          className="mt-1 rounded border px-3 py-2 text-sm"
        />
      </div>

      <button
        type="submit"
        disabled={saving}
        className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {saving ? "Enregistrement..." : "Ajouter / Corriger"}
      </button>
    </form>
  );
}
