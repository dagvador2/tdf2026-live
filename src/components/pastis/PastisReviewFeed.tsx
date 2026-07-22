"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Trash2, Loader2 } from "lucide-react";

interface Row {
  id: string;
  riderId: string;
  riderName: string;
  teamName: string;
  teamColor: string;
  quantity: number;
  photoUrl: string | null;
  caption: string | null;
  source: "self" | "admin";
  createdAt: string;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "à l'instant";
  if (min < 60) return `il y a ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `il y a ${h} h`;
  const d = Math.floor(h / 24);
  return `il y a ${d} j`;
}

export function PastisReviewFeed({ initial }: { initial: Row[] }) {
  const [rows, setRows] = useState<Row[]>(initial);
  const [busy, setBusy] = useState<string | null>(null);

  async function remove(id: string) {
    setBusy(id);
    try {
      const res = await fetch("/api/pastis", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ logId: id }),
      });
      if (res.ok) setRows((r) => r.filter((x) => x.id !== id));
    } catch {
      /* on laisse la ligne en place en cas d'échec */
    } finally {
      setBusy(null);
    }
  }

  if (rows.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-sm text-muted-foreground">
          Aucune déclaration pour l&apos;instant.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {rows.map((row) => (
        <Card key={row.id} className="overflow-hidden">
          <CardContent className="flex items-stretch gap-3 p-0">
            {/* Selfie */}
            <div className="h-24 w-24 shrink-0 bg-muted">
              {row.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={row.photoUrl}
                  alt={`Pastis de ${row.riderName}`}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-2xl">
                  🥃
                </div>
              )}
            </div>

            {/* Infos */}
            <div className="flex min-w-0 flex-1 flex-col justify-center py-2 pr-2">
              <div className="flex items-center gap-1.5">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: row.teamColor }}
                />
                <span className="truncate font-medium">{row.riderName}</span>
                {row.quantity > 1 && (
                  <span className="font-mono text-sm text-muted-foreground">
                    ×{row.quantity}
                  </span>
                )}
                {row.source === "admin" && (
                  <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] uppercase text-muted-foreground">
                    ajout admin
                  </span>
                )}
              </div>
              {row.caption && (
                <p className="mt-0.5 truncate text-sm text-muted-foreground">
                  « {row.caption} »
                </p>
              )}
              <p className="mt-0.5 text-xs text-muted-foreground">
                {timeAgo(row.createdAt)}
              </p>
            </div>

            {/* Retrait */}
            <button
              type="button"
              onClick={() => remove(row.id)}
              disabled={busy === row.id}
              className="flex w-14 shrink-0 items-center justify-center border-l border-border text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-40"
              aria-label={`Retirer le pastis de ${row.riderName}`}
            >
              {busy === row.id ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Trash2 className="h-5 w-5" />
              )}
            </button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
