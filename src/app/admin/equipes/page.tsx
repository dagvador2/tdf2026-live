"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { TeamList } from "@/components/admin/teams/TeamList";
import { TeamForm } from "@/components/admin/teams/TeamForm";

interface Team {
  id: string;
  name: string;
  slug: string;
  color: string;
  description: string | null;
  logoUrl: string | null;
  _count: { riders: number };
}

export default function AdminTeamsPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [editTeam, setEditTeam] = useState<Team | null>(null);
  const [showForm, setShowForm] = useState(false);

  const loadTeams = useCallback(async () => {
    const res = await fetch("/api/admin/teams");
    if (res.ok) setTeams(await res.json());
  }, []);

  useEffect(() => {
    loadTeams();
  }, [loadTeams]);

  async function handleSave(data: {
    id?: string;
    name: string;
    slug: string;
    color: string;
    description: string;
    logoUrl: string | null;
  }) {
    await fetch("/api/admin/teams", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    await loadTeams();
    setEditTeam(null);
    setShowForm(false);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl uppercase">Équipes</h1>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="mr-1 h-4 w-4" />
          Nouvelle équipe
        </Button>
      </div>

      <TeamList teams={teams} onEdit={(t) => { setEditTeam(t); setShowForm(true); }} />

      {showForm && (
        <TeamForm
          open={showForm}
          onClose={() => { setShowForm(false); setEditTeam(null); }}
          onSave={handleSave}
          initialData={
            editTeam
              ? {
                  id: editTeam.id,
                  name: editTeam.name,
                  slug: editTeam.slug,
                  color: editTeam.color,
                  description: editTeam.description ?? "",
                  logoUrl: editTeam.logoUrl,
                }
              : null
          }
        />
      )}
    </div>
  );
}
