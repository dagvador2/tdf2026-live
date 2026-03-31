"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface ValidateButtonProps {
  stageId: string;
  stageName: string;
}

export function ValidateButton({ stageId, stageName }: ValidateButtonProps) {
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleValidate() {
    setLoading(true);
    try {
      await fetch("/api/admin/results", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "validate", stageId }),
      });
      router.refresh();
    } finally {
      setLoading(false);
      setConfirming(false);
    }
  }

  if (!confirming) {
    return (
      <button
        onClick={() => setConfirming(true)}
        className="rounded bg-green-600 px-6 py-3 text-sm font-bold text-white hover:bg-green-700"
      >
        Valider les résultats
      </button>
    );
  }

  return (
    <div className="flex items-center gap-3 rounded-lg border border-yellow-400 bg-yellow-50 p-4">
      <p className="text-sm text-yellow-800">
        Valider les résultats de <strong>{stageName}</strong> ? L&apos;étape
        passera en &quot;Terminée&quot;.
      </p>
      <button
        onClick={handleValidate}
        disabled={loading}
        className="rounded bg-green-600 px-4 py-2 text-sm font-bold text-white hover:bg-green-700 disabled:opacity-50"
      >
        {loading ? "..." : "Confirmer"}
      </button>
      <button
        onClick={() => setConfirming(false)}
        className="rounded border px-4 py-2 text-sm hover:bg-gray-100"
      >
        Annuler
      </button>
    </div>
  );
}
