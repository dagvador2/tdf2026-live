"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { RiderList } from "@/components/admin/riders/RiderList";
import { RiderForm } from "@/components/admin/riders/RiderForm";

interface Team {
  id: string;
  name: string;
  color: string;
}

interface Rider {
  id: string;
  firstName: string;
  nickname: string | null;
  slug: string;
  teamId: string;
  photoUrl: string | null;
  editionCount: number;
  funFacts: Record<string, string> | null;
  team: Team;
}

export default function AdminRidersPage() {
  const [riders, setRiders] = useState<Rider[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [editRider, setEditRider] = useState<Rider | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [linkUrl, setLinkUrl] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    const [ridersRes, teamsRes] = await Promise.all([
      fetch("/api/admin/riders"),
      fetch("/api/admin/teams"),
    ]);
    if (ridersRes.ok) setRiders(await ridersRes.json());
    if (teamsRes.ok) {
      const data = await teamsRes.json();
      setTeams(data.map((t: Team & { _count?: unknown }) => ({ id: t.id, name: t.name, color: t.color })));
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleSave(data: {
    id?: string;
    firstName: string;
    nickname: string;
    slug: string;
    teamId: string;
    photoUrl: string | null;
    editionCount: number;
    funFacts: Record<string, string>;
  }) {
    await fetch("/api/admin/riders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    await loadData();
    setEditRider(null);
    setShowForm(false);
  }

  async function handleGenerateLink(riderId: string) {
    const res = await fetch("/api/admin/generate-rider-token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ riderId }),
    });
    if (res.ok) {
      const data = await res.json();
      setLinkUrl(data.url);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl uppercase">Coureurs</h1>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="mr-1 h-4 w-4" />
          Nouveau coureur
        </Button>
      </div>

      {linkUrl && (
        <div className="rounded-md border border-primary bg-primary/10 p-3">
          <p className="text-sm font-medium">Lien coureur généré :</p>
          <p className="mt-1 break-all font-mono text-xs">{linkUrl}</p>
          <Button
            size="sm"
            variant="outline"
            className="mt-2"
            onClick={() => {
              navigator.clipboard.writeText(linkUrl);
              setLinkUrl(null);
            }}
          >
            Copier et fermer
          </Button>
        </div>
      )}

      <RiderList
        riders={riders}
        onEdit={(r) => {
          const found = riders.find((rider) => rider.id === r.id);
          if (found) { setEditRider(found); setShowForm(true); }
        }}
        onGenerateLink={handleGenerateLink}
      />

      {showForm && (
        <RiderForm
          open={showForm}
          onClose={() => {
            setShowForm(false);
            setEditRider(null);
          }}
          onSave={handleSave}
          teams={teams}
          initialData={
            editRider
              ? {
                  id: editRider.id,
                  firstName: editRider.firstName,
                  nickname: editRider.nickname ?? "",
                  slug: editRider.slug,
                  teamId: editRider.teamId,
                  photoUrl: editRider.photoUrl,
                  editionCount: editRider.editionCount,
                  funFacts: (editRider.funFacts as Record<string, string>) ?? {},
                }
              : null
          }
        />
      )}
    </div>
  );
}
