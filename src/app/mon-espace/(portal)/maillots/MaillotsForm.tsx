"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Check, Loader2, Minus, Plus } from "lucide-react";
import { updateJerseys, type JerseysFormValues } from "./actions";

interface TeamOption {
  slug: string;
  name: string;
  color: string;
  logoUrl: string | null;
}

interface MaillotsFormProps {
  initial: JerseysFormValues;
  teams: TeamOption[];
  ownTeamSlug: string;
}

const JERSEY_SIZE_OPTIONS = ["", "XS", "S", "M", "L", "XL", "XXL"] as const;

export function MaillotsForm({ initial, teams, ownTeamSlug }: MaillotsFormProps) {
  const router = useRouter();
  const [values, setValues] = useState<JerseysFormValues>(initial);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const baselineRef = useRef<string>(JSON.stringify(initial));

  useEffect(() => {
    baselineRef.current = JSON.stringify(initial);
  }, [initial]);

  useEffect(() => {
    if (!saved) return;
    const t = setTimeout(() => setSaved(false), 2500);
    return () => clearTimeout(t);
  }, [saved]);

  const isDirty = JSON.stringify(values) !== baselineRef.current;

  function setJerseySize(size: string) {
    setValues((prev) => ({ ...prev, jerseySize: size }));
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);

    startTransition(async () => {
      const res = await updateJerseys(values);
      if (res.ok) {
        baselineRef.current = JSON.stringify(values);
        setSaved(true);
        router.refresh();
      } else {
        setError(res.error ?? "Erreur inconnue");
      }
    });
  }

  const totalJerseys =
    1 + Object.values(values.extraJerseys).reduce((s, n) => s + n, 0);

  return (
    <form onSubmit={handleSubmit} className="space-y-6 pb-40 md:pb-24">
      {/* Taille */}
      <Card>
        <CardContent className="space-y-4 p-6">
          <div>
            <h2 className="font-display text-lg uppercase">Ta taille</h2>
            <p className="text-xs text-muted-foreground">
              Une seule taille pour tous tes maillots.
            </p>
          </div>

          <select
            value={values.jerseySize}
            onChange={(e) => setJerseySize(e.target.value)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          >
            {JERSEY_SIZE_OPTIONS.map((size) => (
              <option key={size} value={size}>
                {size === "" ? "—" : size}
              </option>
            ))}
          </select>

          <a
            href="https://tdsportswear.com/fr/tableaux-des-tailles/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block text-xs text-muted-foreground underline hover:text-foreground"
          >
            Voir le guide des tailles ↗
          </a>
        </CardContent>
      </Card>

      {/* Maillot d'équipe (inclus) */}
      {(() => {
        const ownTeam = teams.find((t) => t.slug === ownTeamSlug);
        if (!ownTeam) return null;
        return (
          <Card>
            <CardContent className="space-y-4 p-6">
              <div>
                <h2 className="font-display text-lg uppercase">Ton maillot d&apos;équipe</h2>
                <p className="text-xs text-muted-foreground">
                  Inclus automatiquement — tu n&apos;as rien à faire.
                </p>
              </div>
              <div className="overflow-hidden rounded-lg border border-border">
                <div className="relative bg-muted/30" style={{ aspectRatio: "2.4 / 1" }}>
                  <Image
                    src={`/teams/${ownTeam.slug}-jersey.png`}
                    alt={`Maillot ${ownTeam.name}`}
                    fill
                    sizes="(max-width: 640px) 100vw, 600px"
                    className="object-contain"
                    unoptimized
                  />
                </div>
                <div className="flex items-center justify-between gap-3 p-3">
                  <p className="text-sm font-medium" style={{ color: ownTeam.color }}>
                    {ownTeam.name}
                  </p>
                  <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                    Inclus
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })()}

      {/* Maillots additionnels */}
      <Card>
        <CardContent className="space-y-4 p-6">
          <div>
            <h2 className="font-display text-lg uppercase">Maillots additionnels</h2>
            <p className="text-xs text-muted-foreground">
              Tu peux ajouter des maillots d&apos;autres équipes (ou des doublons du tien)
              {values.jerseySize ? (
                <> dans ta taille <strong>{values.jerseySize}</strong>.</>
              ) : (
                <> — pense à renseigner ta taille d&apos;abord.</>
              )}
            </p>
          </div>

          <div className="space-y-3">
            {teams
              .filter((t) => t.slug !== ownTeamSlug)
              .map((team) => {
                const qty = values.extraJerseys[team.slug] ?? 0;
                return (
                  <div
                    key={team.slug}
                    className="overflow-hidden rounded-lg border border-border"
                  >
                    <div className="relative bg-muted/30" style={{ aspectRatio: "2.4 / 1" }}>
                      <Image
                        src={`/teams/${team.slug}-jersey.png`}
                        alt={`Maillot ${team.name}`}
                        fill
                        sizes="(max-width: 640px) 100vw, 600px"
                        className="object-contain"
                        unoptimized
                      />
                    </div>
                    <div className="flex items-center gap-3 p-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium" style={{ color: team.color }}>
                          {team.name}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="h-9 w-9"
                          onClick={() => setExtraJersey(team.slug, qty - 1)}
                          disabled={qty <= 0}
                          aria-label="Diminuer"
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                        <span className="w-6 text-center font-mono text-base font-bold tabular-nums">
                          {qty}
                        </span>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="h-9 w-9"
                          onClick={() => setExtraJersey(team.slug, qty + 1)}
                          disabled={qty >= 10}
                          aria-label="Augmenter"
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>

          <div className="rounded-md bg-muted/50 px-3 py-2 text-sm">
            <span className="text-muted-foreground">Total à recevoir :</span>{" "}
            <strong>{totalJerseys}</strong> maillot{totalJerseys > 1 ? "s" : ""}
          </div>
        </CardContent>
      </Card>

      {/* Toast confirmation — décalé au-dessus de la nav mobile */}
      {saved && !error && !isDirty && (
        <div
          aria-live="polite"
          className="pointer-events-none fixed inset-x-0 bottom-20 z-[60] flex justify-center px-4 md:bottom-4"
        >
          <div className="pointer-events-auto flex items-center gap-2 rounded-full bg-green-600 px-4 py-2 text-sm font-medium text-white shadow-lg animate-in fade-in slide-in-from-bottom-4">
            <Check className="h-4 w-4" />
            Enregistré
          </div>
        </div>
      )}

      {/* Barre flottante save — au-dessus de MobileNav (h-16) sur mobile, bottom-0 sur desktop */}
      <div
        aria-hidden={!isDirty && !error}
        className={`fixed inset-x-0 bottom-16 z-[60] transition-transform duration-200 ease-out md:bottom-0 ${
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
              <Button type="submit" disabled={isPending || !isDirty}>
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
