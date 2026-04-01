"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { FunFactsForm } from "./FunFactsForm";

interface RiderFormData {
  id?: string;
  firstName: string;
  nickname: string;
  slug: string;
  teamId: string;
  photoUrl: string | null;
  editionCount: number;
  funFacts: Record<string, string>;
}

interface Team {
  id: string;
  name: string;
  color: string;
}

interface RiderFormProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: RiderFormData) => Promise<void>;
  initialData?: RiderFormData | null;
  teams: Team[];
}

export function RiderForm({
  open,
  onClose,
  onSave,
  initialData,
  teams,
}: RiderFormProps) {
  const [form, setForm] = useState<RiderFormData>(
    initialData ?? {
      firstName: "",
      nickname: "",
      slug: "",
      teamId: teams[0]?.id ?? "",
      photoUrl: null,
      editionCount: 1,
      funFacts: {},
    }
  );
  const [saving, setSaving] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);

  const isEdit = !!initialData?.id;

  useEffect(() => {
    if (initialData) {
      setForm(initialData);
    } else {
      setForm({
        firstName: "",
        nickname: "",
        slug: "",
        teamId: teams[0]?.id ?? "",
        photoUrl: null,
        editionCount: 1,
        funFacts: {},
      });
    }
  }, [initialData, teams]);

  function handleNameChange(firstName: string) {
    const slug = firstName
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
    setForm((f) => ({ ...f, firstName, slug: isEdit ? f.slug : slug }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    let photoUrl = form.photoUrl;
    if (photoFile) {
      const fd = new FormData();
      fd.append("file", photoFile);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      if (res.ok) {
        const data = await res.json();
        photoUrl = data.url;
      }
    }

    await onSave({ ...form, photoUrl });
    setSaving(false);
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Modifier le coureur" : "Nouveau coureur"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Prénom</label>
              <Input
                value={form.firstName}
                onChange={(e) => handleNameChange(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Surnom</label>
              <Input
                value={form.nickname}
                onChange={(e) =>
                  setForm((f) => ({ ...f, nickname: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Slug</label>
              <Input
                value={form.slug}
                onChange={(e) =>
                  setForm((f) => ({ ...f, slug: e.target.value }))
                }
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Équipe</label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={form.teamId}
                onChange={(e) =>
                  setForm((f) => ({ ...f, teamId: e.target.value }))
                }
              >
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Éditions</label>
              <Input
                type="number"
                min={1}
                value={form.editionCount}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    editionCount: parseInt(e.target.value) || 1,
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Photo</label>
              <Input
                type="file"
                accept="image/*"
                onChange={(e) => setPhotoFile(e.target.files?.[0] ?? null)}
              />
            </div>
          </div>

          <FunFactsForm
            value={form.funFacts}
            onChange={(funFacts) => setForm((f) => ({ ...f, funFacts }))}
          />

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Annuler
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
