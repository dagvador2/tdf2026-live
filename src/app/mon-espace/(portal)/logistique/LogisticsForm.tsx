"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Check, Loader2 } from "lucide-react";
import {
  ARRIVAL_METHODS,
  type LogisticsData,
} from "@/lib/rider/logistics";
import { updateLogistics } from "./actions";

interface LogisticsFormProps {
  initial: LogisticsData;
}

export function LogisticsForm({ initial }: LogisticsFormProps) {
  const router = useRouter();
  const [values, setValues] = useState<LogisticsData>(initial);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function setField<K extends keyof LogisticsData>(
    key: K,
    v: LogisticsData[K]
  ) {
    setValues((prev) => ({ ...prev, [key]: v }));
    setSaved(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);

    startTransition(async () => {
      const res = await updateLogistics(values);
      if (res.ok) {
        setSaved(true);
        router.refresh();
      } else {
        setError(res.error ?? "Erreur inconnue");
      }
    });
  }

  const isCar = values.arrivalMethod === "car";

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardContent className="space-y-4 p-6">
          <h2 className="font-display text-lg uppercase">Arrivée</h2>

          <Field label="Moyen d'arrivée">
            <select
              value={values.arrivalMethod}
              onChange={(e) =>
                setField(
                  "arrivalMethod",
                  e.target.value as LogisticsData["arrivalMethod"]
                )
              }
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            >
              {ARRIVAL_METHODS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Date d'arrivée">
              <Input
                type="date"
                value={values.arrivalDate}
                onChange={(e) => setField("arrivalDate", e.target.value)}
              />
            </Field>

            <Field label="Heure estimée">
              <Input
                type="time"
                value={values.arrivalTime}
                onChange={(e) => setField("arrivalTime", e.target.value)}
              />
            </Field>
          </div>

          <Field label="Gare / Lieu d'arrivée">
            <Input
              value={values.arrivalLocation}
              onChange={(e) => setField("arrivalLocation", e.target.value)}
              placeholder="Ex: Gare de Grenoble"
            />
          </Field>

          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={values.needsPickup}
              onChange={(e) => setField("needsPickup", e.target.checked)}
              className="h-4 w-4"
            />
            <span className="text-sm">Besoin d&apos;être récupéré</span>
          </label>
        </CardContent>
      </Card>

      {isCar && (
        <Card>
          <CardContent className="space-y-4 p-6">
            <div>
              <h2 className="font-display text-lg uppercase">Places dispo</h2>
              <p className="text-xs text-muted-foreground">
                Pour aider à organiser les covoiturages entre coureurs.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Places vélo">
                <Input
                  type="number"
                  min="0"
                  max="20"
                  value={values.bikeSpaces}
                  onChange={(e) => setField("bikeSpaces", e.target.value)}
                />
              </Field>

              <Field label="Places passager">
                <Input
                  type="number"
                  min="0"
                  max="20"
                  value={values.passengerSpaces}
                  onChange={(e) => setField("passengerSpaces", e.target.value)}
                />
              </Field>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="space-y-4 p-6">
          <h2 className="font-display text-lg uppercase">Départ & divers</h2>

          <Field label="Date de départ">
            <Input
              type="date"
              value={values.departureDate}
              onChange={(e) => setField("departureDate", e.target.value)}
            />
          </Field>

          <Field label="Commentaire">
            <textarea
              value={values.comment}
              onChange={(e) => setField("comment", e.target.value)}
              placeholder="Infos complémentaires (ex: j'arrive avec X, Blablacar, etc.)"
              rows={3}
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            />
          </Field>
        </CardContent>
      </Card>

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
          <Button type="submit" disabled={isPending}>
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
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium">{label}</label>
      {children}
    </div>
  );
}
