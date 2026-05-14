"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Camera, Check, Loader2, Minus, Plus } from "lucide-react";
import { FUN_FACT_FIELDS } from "@/lib/constants/fun-facts";
import { updateProfile, type ProfileFormValues } from "./actions";

interface TeamOption {
  slug: string;
  name: string;
  color: string;
  logoUrl: string | null;
}

interface ProfileFormProps {
  initial: ProfileFormValues;
  teams: TeamOption[];
  ownTeamSlug: string;
}

const LEVEL_OPTIONS = [
  { value: "", label: "—" },
  { value: "beginner", label: "Débutant" },
  { value: "intermediate", label: "Intermédiaire" },
  { value: "advanced", label: "Avancé" },
  { value: "competitor", label: "Compétiteur" },
];

const JERSEY_SIZE_OPTIONS = ["", "XS", "S", "M", "L", "XL", "XXL"] as const;

export function ProfileForm({ initial, teams, ownTeamSlug }: ProfileFormProps) {
  const router = useRouter();
  const [values, setValues] = useState<ProfileFormValues>(initial);
  const [uploading, setUploading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const baselineRef = useRef<string>(JSON.stringify(initial));

  // Si le parent renvoie un nouveau "initial" (après router.refresh), on resynchronise.
  useEffect(() => {
    baselineRef.current = JSON.stringify(initial);
  }, [initial]);

  // Toast "Enregistré" : fade out après 2.5s
  useEffect(() => {
    if (!saved) return;
    const t = setTimeout(() => setSaved(false), 2500);
    return () => clearTimeout(t);
  }, [saved]);

  const isDirty = JSON.stringify(values) !== baselineRef.current;

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

  function setExtraJersey(slug: string, qty: number) {
    setValues((prev) => {
      const next = { ...prev.extraJerseys };
      if (qty <= 0) delete next[slug];
      else next[slug] = Math.min(qty, 10);
      return { ...prev, extraJerseys: next };
    });
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
        baselineRef.current = JSON.stringify(values);
        setSaved(true);
        router.refresh();
      } else {
        setError(res.error ?? "Erreur inconnue");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 pb-24">
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

          <Field label="Taille du maillot">
            <select
              value={values.jerseySize}
              onChange={(e) => setField("jerseySize", e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            >
              {JERSEY_SIZE_OPTIONS.map((size) => (
                <option key={size} value={size}>
                  {size === "" ? "—" : size}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-muted-foreground">
              Une seule taille pour tous tes maillots.
            </p>
            <a
              href="https://tdsportswear.com/fr/tableaux-des-tailles/"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 inline-block text-xs text-muted-foreground underline hover:text-foreground"
            >
              Voir le guide des tailles ↗
            </a>
          </Field>
        </CardContent>
      </Card>

      {/* Maillots additionnels */}
      <Card>
        <CardContent className="space-y-4 p-6">
          <div>
            <h2 className="font-display text-lg uppercase">Maillots additionnels</h2>
            <p className="text-xs text-muted-foreground">
              En plus de ton maillot d&apos;équipe (inclus). Tu peux commander des maillots d&apos;autres équipes
              {values.jerseySize ? (
                <> dans ta taille <strong>{values.jerseySize}</strong>.</>
              ) : (
                <> — pense à renseigner ta taille d&apos;abord.</>
              )}
            </p>
          </div>

          <div className="space-y-2">
            {teams.map((team) => {
              const qty = values.extraJerseys[team.slug] ?? 0;
              const isOwn = team.slug === ownTeamSlug;
              return (
                <div
                  key={team.slug}
                  className="flex items-center gap-3 rounded-md border border-border p-3"
                >
                  <div
                    className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full"
                    style={{ backgroundColor: `${team.color}20` }}
                  >
                    {team.logoUrl ? (
                      <Image src={team.logoUrl} alt={team.name} width={28} height={28} className="h-7 w-7 object-contain" unoptimized />
                    ) : (
                      <span className="text-xs font-bold" style={{ color: team.color }}>
                        {team.name.slice(0, 2).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{team.name}</p>
                    {isOwn && (
                      <p className="text-xs text-muted-foreground">Ton équipe — un maillot déjà inclus</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setExtraJersey(team.slug, qty - 1)}
                      disabled={qty <= 0}
                      aria-label="Diminuer"
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <span className="w-6 text-center font-mono text-sm tabular-nums">{qty}</span>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setExtraJersey(team.slug, qty + 1)}
                      disabled={qty >= 10}
                      aria-label="Augmenter"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
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

      {/* Toast d'enregistrement réussi (apparaît brièvement) */}
      {saved && !error && !isDirty && (
        <div
          aria-live="polite"
          className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex justify-center px-4"
        >
          <div className="pointer-events-auto flex items-center gap-2 rounded-full bg-green-600 px-4 py-2 text-sm font-medium text-white shadow-lg animate-in fade-in slide-in-from-bottom-4">
            <Check className="h-4 w-4" />
            Enregistré
          </div>
        </div>
      )}

      {/* Barre flottante : visible uniquement quand il y a des modifs non enregistrées */}
      <div
        aria-hidden={!isDirty && !error}
        className={`fixed inset-x-0 bottom-0 z-40 transition-transform duration-200 ease-out ${
          isDirty || error ? "translate-y-0" : "translate-y-full"
        }`}
      >
        <div className="mx-auto max-w-2xl px-4 pb-[max(env(safe-area-inset-bottom),0.75rem)] pt-3">
          <div className="rounded-lg border border-border bg-background/95 px-4 py-3 shadow-xl backdrop-blur">
            <div className="flex items-center justify-between gap-3">
              <div className="flex-1 text-sm">
                {error ? (
                  <span className="text-destructive">{error}</span>
                ) : (
                  <span className="text-muted-foreground">Modifications non enregistrées</span>
                )}
              </div>
              <Button type="submit" disabled={isPending || uploading || !isDirty}>
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
