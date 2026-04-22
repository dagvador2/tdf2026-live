"use client";

import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";

type ArrivalMethod = "car" | "train" | "carpool" | "other" | null;

interface RiderRow {
  id: string;
  firstName: string;
  nickname: string | null;
  team: { name: string; color: string };
  logistics: {
    arrivalMethod: ArrivalMethod;
    arrivalDate: string | null;
    arrivalTime: string | null;
    arrivalLocation: string | null;
    needsPickup: boolean;
    departureDate: string | null;
    bikeSpaces: number | null;
    passengerSpaces: number | null;
    comment: string | null;
  } | null;
}

const METHOD_LABELS: Record<string, string> = {
  car: "Voiture",
  train: "Train",
  carpool: "Covoiturage",
  other: "Autre",
};

export function LogisticsTable({ riders }: { riders: RiderRow[] }) {
  const [filterDate, setFilterDate] = useState("");
  const [filterMethod, setFilterMethod] = useState("");
  const [onlyPickup, setOnlyPickup] = useState(false);
  const [onlyMissing, setOnlyMissing] = useState(false);

  const filtered = useMemo(() => {
    return riders.filter((r) => {
      if (onlyMissing && r.logistics?.arrivalDate) return false;
      if (onlyPickup && !r.logistics?.needsPickup) return false;
      if (filterDate && r.logistics?.arrivalDate !== filterDate) return false;
      if (filterMethod && r.logistics?.arrivalMethod !== filterMethod) return false;
      return true;
    });
  }, [riders, filterDate, filterMethod, onlyPickup, onlyMissing]);

  return (
    <div>
      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">
            Date d&apos;arrivée
          </label>
          <Input
            type="date"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            className="h-9 w-44"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">
            Moyen
          </label>
          <select
            value={filterMethod}
            onChange={(e) => setFilterMethod(e.target.value)}
            className="h-9 rounded-md border border-input bg-background px-2 text-sm"
          >
            <option value="">Tous</option>
            {Object.entries(METHOD_LABELS).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </div>
        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={onlyPickup}
            onChange={(e) => setOnlyPickup(e.target.checked)}
          />
          Récupération uniquement
        </label>
        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={onlyMissing}
            onChange={(e) => setOnlyMissing(e.target.checked)}
          />
          Non renseigné uniquement
        </label>
        {(filterDate || filterMethod || onlyPickup || onlyMissing) && (
          <button
            type="button"
            onClick={() => {
              setFilterDate("");
              setFilterMethod("");
              setOnlyPickup(false);
              setOnlyMissing(false);
            }}
            className="text-xs text-muted-foreground underline"
          >
            Réinitialiser
          </button>
        )}
      </div>

      <p className="mb-2 text-xs text-muted-foreground">
        {filtered.length} coureur{filtered.length !== 1 ? "s" : ""}
      </p>

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="p-3 text-left font-medium">Coureur</th>
              <th className="p-3 text-left font-medium">Équipe</th>
              <th className="p-3 text-left font-medium">Moyen</th>
              <th className="p-3 text-left font-medium">Arrivée</th>
              <th className="p-3 text-left font-medium">Lieu</th>
              <th className="p-3 text-center font-medium">Pickup</th>
              <th className="p-3 text-left font-medium">Départ</th>
              <th className="p-3 text-center font-medium">Vélos</th>
              <th className="p-3 text-center font-medium">Pax</th>
              <th className="p-3 text-left font-medium">Commentaire</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td
                  colSpan={10}
                  className="p-6 text-center text-sm text-muted-foreground"
                >
                  Aucun résultat.
                </td>
              </tr>
            )}
            {filtered.map((r) => (
              <tr key={r.id} className="border-t">
                <td className="p-3 font-medium">
                  {r.firstName}
                  {r.nickname && (
                    <span className="ml-1 text-xs text-muted-foreground">
                      ({r.nickname})
                    </span>
                  )}
                </td>
                <td className="p-3">
                  <span
                    className="rounded px-1.5 py-0.5 text-[10px] font-medium"
                    style={{
                      backgroundColor: `${r.team.color}22`,
                      color: r.team.color,
                    }}
                  >
                    {r.team.name}
                  </span>
                </td>
                <td className="p-3">
                  {r.logistics?.arrivalMethod ? (
                    METHOD_LABELS[r.logistics.arrivalMethod]
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>
                <td className="p-3 font-mono text-xs">
                  {r.logistics?.arrivalDate ? (
                    <>
                      {formatDate(r.logistics.arrivalDate)}
                      {r.logistics.arrivalTime && (
                        <span className="ml-1 text-muted-foreground">
                          {r.logistics.arrivalTime}
                        </span>
                      )}
                    </>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>
                <td className="p-3">
                  {r.logistics?.arrivalLocation || (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>
                <td className="p-3 text-center">
                  {r.logistics?.needsPickup ? (
                    <span className="rounded-full bg-orange-100 px-2 py-0.5 text-xs text-orange-700">
                      Oui
                    </span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>
                <td className="p-3 font-mono text-xs">
                  {r.logistics?.departureDate ? (
                    formatDate(r.logistics.departureDate)
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>
                <td className="p-3 text-center font-mono">
                  {r.logistics?.bikeSpaces ?? (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>
                <td className="p-3 text-center font-mono">
                  {r.logistics?.passengerSpaces ?? (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>
                <td className="max-w-xs p-3 text-xs text-muted-foreground">
                  {r.logistics?.comment || "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("fr-FR", {
      weekday: "short",
      day: "2-digit",
      month: "short",
    });
  } catch {
    return iso;
  }
}
