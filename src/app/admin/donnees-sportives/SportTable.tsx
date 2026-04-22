"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

const LEVEL_LABELS: Record<string, string> = {
  beginner: "Débutant",
  intermediate: "Intermédiaire",
  advanced: "Avancé",
  competitor: "Compétiteur",
};

interface SportRow {
  id: string;
  firstName: string;
  nickname: string | null;
  team: { name: string; color: string };
  weightKg: number | null;
  ftpWatts: number | null;
  level: string | null;
}

type SortKey = "name" | "team" | "weight" | "ftp" | "wkg";

export function SportTable({ riders }: { riders: SportRow[] }) {
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDesc, setSortDesc] = useState(false);
  const [onlyMissing, setOnlyMissing] = useState(false);

  const sorted = useMemo(() => {
    const filtered = onlyMissing
      ? riders.filter((r) => r.weightKg == null || r.ftpWatts == null)
      : riders;

    const withWkg = filtered.map((r) => ({
      ...r,
      wkg: r.weightKg && r.ftpWatts ? r.ftpWatts / r.weightKg : null,
    }));

    return withWkg.sort((a, b) => {
      let diff = 0;
      switch (sortKey) {
        case "name":
          diff = a.firstName.localeCompare(b.firstName);
          break;
        case "team":
          diff = a.team.name.localeCompare(b.team.name);
          break;
        case "weight":
          diff = (a.weightKg ?? Infinity) - (b.weightKg ?? Infinity);
          break;
        case "ftp":
          diff = (a.ftpWatts ?? -1) - (b.ftpWatts ?? -1);
          break;
        case "wkg":
          diff = (a.wkg ?? -1) - (b.wkg ?? -1);
          break;
      }
      return sortDesc ? -diff : diff;
    });
  }, [riders, sortKey, sortDesc, onlyMissing]);

  function handleSort(key: SortKey) {
    if (sortKey === key) setSortDesc(!sortDesc);
    else {
      setSortKey(key);
      setSortDesc(key !== "name" && key !== "team");
    }
  }

  function handleExportCSV() {
    const header = [
      "Prénom",
      "Surnom",
      "Équipe",
      "Poids (kg)",
      "FTP (W)",
      "W/kg",
      "Niveau",
    ];
    const lines = [header.join(",")];
    for (const r of sorted) {
      const line = [
        r.firstName,
        r.nickname ?? "",
        r.team.name,
        r.weightKg ?? "",
        r.ftpWatts ?? "",
        r.wkg != null ? r.wkg.toFixed(2) : "",
        r.level ? LEVEL_LABELS[r.level] ?? r.level : "",
      ]
        .map((v) => {
          const s = String(v);
          return s.includes(",") || s.includes('"')
            ? `"${s.replace(/"/g, '""')}"`
            : s;
        })
        .join(",");
      lines.push(line);
    }
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `donnees-sportives-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <div className="mb-4 flex items-center gap-3">
        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={onlyMissing}
            onChange={(e) => setOnlyMissing(e.target.checked)}
          />
          Non renseignés uniquement
        </label>
        <span className="text-xs text-muted-foreground">
          {sorted.length} coureur{sorted.length !== 1 ? "s" : ""}
        </span>
        <div className="ml-auto">
          <Button variant="outline" size="sm" onClick={handleExportCSV}>
            <Download className="mr-1 h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <Th onClick={() => handleSort("name")} active={sortKey === "name"} desc={sortDesc}>
                Coureur
              </Th>
              <Th onClick={() => handleSort("team")} active={sortKey === "team"} desc={sortDesc}>
                Équipe
              </Th>
              <Th onClick={() => handleSort("weight")} active={sortKey === "weight"} desc={sortDesc} align="right">
                Poids
              </Th>
              <Th onClick={() => handleSort("ftp")} active={sortKey === "ftp"} desc={sortDesc} align="right">
                FTP
              </Th>
              <Th onClick={() => handleSort("wkg")} active={sortKey === "wkg"} desc={sortDesc} align="right">
                W/kg
              </Th>
              <th className="p-3 text-left font-medium">Niveau</th>
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="p-6 text-center text-sm text-muted-foreground"
                >
                  Aucun résultat.
                </td>
              </tr>
            )}
            {sorted.map((r) => {
              const missing = r.weightKg == null || r.ftpWatts == null;
              return (
                <tr key={r.id} className={`border-t ${missing ? "bg-orange-50/40" : ""}`}>
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
                  <td className="p-3 text-right font-mono">
                    {r.weightKg != null ? (
                      `${r.weightKg.toFixed(1)} kg`
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="p-3 text-right font-mono">
                    {r.ftpWatts != null ? (
                      `${r.ftpWatts} W`
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="p-3 text-right font-mono font-bold">
                    {r.wkg != null ? (
                      r.wkg.toFixed(2)
                    ) : (
                      <span className="font-normal text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="p-3">
                    {r.level ? (
                      LEVEL_LABELS[r.level] ?? r.level
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Th({
  children,
  onClick,
  active,
  desc,
  align = "left",
}: {
  children: React.ReactNode;
  onClick: () => void;
  active: boolean;
  desc: boolean;
  align?: "left" | "right";
}) {
  return (
    <th
      onClick={onClick}
      className={`cursor-pointer select-none p-3 font-medium hover:bg-muted ${
        align === "right" ? "text-right" : "text-left"
      }`}
    >
      {children}
      {active && <span className="ml-1 text-xs">{desc ? "▼" : "▲"}</span>}
    </th>
  );
}
