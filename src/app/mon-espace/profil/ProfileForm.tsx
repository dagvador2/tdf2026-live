"use client";

import { useState, useTransition, useRef } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Camera, Check, Loader2 } from "lucide-react";
import { FUN_FACT_FIELDS } from "@/lib/constants/fun-facts";
import { updateProfile, type ProfileFormValues } from "./actions";

interface ProfileFormProps {
  initial: ProfileFormValues;
}

const LEVEL_OPTIONS = [
  { value: "", label: "—" },
  { value: "beginner", label: "Débutant" },
  { value: "intermediate", label: "Intermédiaire" },
  { value: "advanced", label: "Avancé" },
  { value: "competitor", label: "Compétiteur" },
];

export function ProfileForm({ initial }: ProfileFormProps) {
  const router = useRouter();
  const [values, setValues] = useState<ProfileFormValues>(initial);
  const [uploading, setUploading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);

  function setField<K extends keyof ProfileFormValues>(
    key: K,
    v: ProfileFormValues[K]
  ) {
    setValues((prev) => ({ ...prev, [key]: v }));
    setSaved(false);
  }

  function setFunFact(key: string, v: string) {
    setValues((prev) => ({
      ...prev,
      funFacts: { ...prev.funFacts, [key]: v },
    }));
    setSaved(false);
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Échec de l'upload");
      }
      const { url } = await res.json();
      setField("photoUrl", url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur d'upload");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);

    startTransition(async () => {
      const res = await updateProfile(values);
      if (res.ok) {
        setSaved(true);
        router.refresh();
      } else {
        setError(res.error ?? "Erreur inconnue");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Profil de base */}
      <Card>
        <CardContent className="space-y-4 p-6">
          <h2 className="font-display text-lg uppercase">Mon profil</h2>

          {/* Photo */}
          <div>
            <label className="mb-2 block text-sm font-medium">Photo</label>
            <div className="flex items-center gap-4">
              {values.photoUrl ? (
                <Image
                  src={values.photoUrl}
                  alt="Photo de profil"
                  width={80}
                  height={80}
                  className="h-20 w-20 rounded-full object-cover"
                  unoptimized
                />
              ) : (
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted">
                  <Camera className="h-8 w-8 text-muted-foreground" />
                </div>
              )}
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileChange}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  {uploading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Camera className="mr-2 h-4 w-4" />
                  )}
                  {uploading ? "Envoi..." : "Changer"}
                </Button>
                {values.photoUrl && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="ml-2"
                    onClick={() => setField("photoUrl", "")}
                  >
                    Retirer
                  </Button>
                )}
              </div>
            </div>
          </div>

          <Field label="Prénom" required>
            <Input
              value={values.firstName}
              onChange={(e) => setField("firstName", e.target.value)}
              required
            />
          </Field>

          <Field label="Surnom">
            <Input
              value={values.nickname}
              onChange={(e) => setField("nickname", e.target.value)}
              placeholder="Optionnel"
            />
          </Field>
        </CardContent>
      </Card>

      {/* Infos sportives */}
      <Card>
        <CardContent className="space-y-4 p-6">
          <div>
            <h2 className="font-display text-lg uppercase">
              Données sportives
            </h2>
            <p className="text-xs text-muted-foreground">
              Visibles uniquement par l&apos;admin (équilibrage des équipes).
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Poids (kg)">
              <Input
                type="number"
                step="0.1"
                min="30"
                max="200"
                value={values.weightKg}
                onChange={(e) => setField("weightKg", e.target.value)}
                placeholder="72.5"
              />
            </Field>

            <Field label="FTP (watts)">
              <Input
                type="number"
                min="50"
                max="600"
                value={values.ftpWatts}
                onChange={(e) => setField("ftpWatts", e.target.value)}
                placeholder="250"
              />
            </Field>
          </div>

          <Field label="Niveau estimé">
            <select
              value={values.level}
              onChange={(e) => setField("level", e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            >
              {LEVEL_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </Field>
        </CardContent>
      </Card>

      {/* Fun facts */}
      <Card>
        <CardContent className="space-y-4 p-6">
          <div>
            <h2 className="font-display text-lg uppercase">Fun facts</h2>
            <p className="text-xs text-muted-foreground">
              Visibles publiquement sur ta fiche coureur.
            </p>
          </div>

          {FUN_FACT_FIELDS.map((field) => (
            <Field key={field.key} label={field.label}>
              <Input
                value={values.funFacts[field.key] ?? ""}
                onChange={(e) => setFunFact(field.key, e.target.value)}
                placeholder="Optionnel"
              />
            </Field>
          ))}
        </CardContent>
      </Card>

      {/* Sticky save bar */}
      <div className="sticky bottom-0 -mx-4 border-t bg-background/95 px-4 py-3 backdrop-blur sm:bottom-4 sm:mx-0 sm:rounded-lg sm:border">
        <div className="flex items-center justify-between gap-3">
          <div className="flex-1 text-sm">
            {error && <span className="text-destructive">{error}</span>}
            {saved && !error && (
              <span className="flex items-center gap-1 text-green-600">
                <Check className="h-4 w-4" />
                Enregistré
              </span>
            )}
          </div>
          <Button type="submit" disabled={isPending || uploading}>
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Enregistrement...
              </>
            ) : (
              "Enregistrer"
            )}
          </Button>
        </div>
      </div>
    </form>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium">
        {label}
        {required && <span className="ml-0.5 text-destructive">*</span>}
      </label>
      {children}
    </div>
  );
}
