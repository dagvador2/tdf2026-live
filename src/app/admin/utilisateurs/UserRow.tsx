"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Link2, Unlink } from "lucide-react";
import { linkUserToRider, unlinkUser } from "./actions";

interface RiderOption {
  id: string;
  label: string;
  taken: boolean;
}

interface UserRowProps {
  user: {
    id: string;
    email: string | null;
    name: string | null;
    image: string | null;
    role: string;
    createdAt: Date;
    rider: {
      id: string;
      firstName: string;
      nickname: string | null;
      team: { name: string; color: string };
    } | null;
  };
  riders: RiderOption[];
}

export function UserRow({ user, riders }: UserRowProps) {
  const [selectedRiderId, setSelectedRiderId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleLink() {
    if (!selectedRiderId) return;
    setError(null);
    startTransition(async () => {
      const res = await linkUserToRider(user.id, selectedRiderId);
      if (!res.ok) setError(res.error ?? "Erreur");
      else setSelectedRiderId("");
    });
  }

  function handleUnlink() {
    if (!confirm("Dissocier ce compte du coureur ?")) return;
    setError(null);
    startTransition(async () => {
      const res = await unlinkUser(user.id);
      if (!res.ok) setError(res.error ?? "Erreur");
    });
  }

  return (
    <tr className="border-b">
      <td className="p-3">
        <div className="flex items-center gap-2">
          {user.image && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={user.image}
              alt=""
              className="h-8 w-8 rounded-full"
            />
          )}
          <div>
            <p className="text-sm font-medium">
              {user.name ?? user.email ?? "—"}
            </p>
            {user.name && (
              <p className="text-xs text-muted-foreground">{user.email}</p>
            )}
          </div>
        </div>
      </td>
      <td className="p-3 text-xs">
        <RoleBadge role={user.role} />
      </td>
      <td className="p-3">
        {user.rider ? (
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">
              {user.rider.firstName}
              {user.rider.nickname && (
                <span className="ml-1 text-muted-foreground">
                  ({user.rider.nickname})
                </span>
              )}
            </span>
            <span
              className="rounded px-1.5 py-0.5 text-[10px] font-medium"
              style={{
                backgroundColor: `${user.rider.team.color}22`,
                color: user.rider.team.color,
              }}
            >
              {user.rider.team.name}
            </span>
          </div>
        ) : (
          <div className="flex flex-col items-start gap-1">
            <div className="flex items-center gap-2">
              <select
                value={selectedRiderId}
                onChange={(e) => setSelectedRiderId(e.target.value)}
                className="h-8 rounded border border-input bg-background px-2 text-xs"
                disabled={isPending}
              >
                <option value="">— Choisir un coureur —</option>
                {riders.map((r) => (
                  <option key={r.id} value={r.id} disabled={r.taken}>
                    {r.label}
                    {r.taken ? " (déjà lié)" : ""}
                  </option>
                ))}
              </select>
              <Button
                size="sm"
                variant="outline"
                onClick={handleLink}
                disabled={isPending || !selectedRiderId}
              >
                {isPending ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Link2 className="h-3 w-3" />
                )}
              </Button>
            </div>
            {error && <span className="text-xs text-destructive">{error}</span>}
          </div>
        )}
      </td>
      <td className="p-3 text-right">
        {user.rider && user.role !== "admin" && (
          <Button
            size="sm"
            variant="ghost"
            onClick={handleUnlink}
            disabled={isPending}
          >
            {isPending ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <>
                <Unlink className="mr-1 h-3 w-3" />
                Dissocier
              </>
            )}
          </Button>
        )}
      </td>
    </tr>
  );
}

function RoleBadge({ role }: { role: string }) {
  const styles: Record<string, string> = {
    admin: "bg-primary text-primary-foreground",
    rider: "bg-green-100 text-green-700",
    pending: "bg-orange-100 text-orange-700",
  };
  const labels: Record<string, string> = {
    admin: "Admin",
    rider: "Coureur",
    pending: "En attente",
  };
  return (
    <span
      className={`rounded px-2 py-0.5 text-[10px] font-medium ${styles[role] ?? "bg-muted"}`}
    >
      {labels[role] ?? role}
    </span>
  );
}
