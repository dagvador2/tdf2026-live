"use client";

import { useEffect, useState } from "react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { usePushSubscription } from "@/hooks/usePushSubscription";
import { Bell, BellOff, AlertCircle } from "lucide-react";

interface Preferences {
  stageStart: boolean;
  newStory: boolean;
  feedHighlights: boolean;
  myResults: boolean;
}

const PREF_LABELS: Record<keyof Preferences, { title: string; desc: string }> = {
  stageStart: {
    title: "Une étape démarre",
    desc: "Quand l'admin lance le départ d'une étape",
  },
  newStory: {
    title: "Nouvelle histoire publiée",
    desc: "Quand une nouvelle histoire du Tour est publiée",
  },
  feedHighlights: {
    title: "Moments forts",
    desc: "Posts importants du fil d'actu",
  },
  myResults: {
    title: "Mes résultats",
    desc: "Quand mon résultat d'étape est validé",
  },
};

function isIos(): boolean {
  if (typeof window === "undefined") return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(display-mode: standalone)").matches;
}

export function NotificationsClient({ initial }: { initial: Preferences }) {
  const { supported, permission, isSubscribed, loading, error, subscribe, unsubscribe } =
    usePushSubscription();

  const [prefs, setPrefs] = useState<Preferences>(initial);
  const [savingKey, setSavingKey] = useState<keyof Preferences | null>(null);
  const [iosWarning, setIosWarning] = useState(false);

  useEffect(() => {
    setIosWarning(isIos() && !isStandalone());
  }, []);

  async function togglePref(key: keyof Preferences, next: boolean) {
    setPrefs((p) => ({ ...p, [key]: next }));
    setSavingKey(key);
    const res = await fetch("/api/notifications/preferences", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [key]: next }),
    });
    setSavingKey(null);
    if (!res.ok) {
      // revert on error
      setPrefs((p) => ({ ...p, [key]: !next }));
    }
  }

  return (
    <div className="space-y-6">
      {/* Status / activation */}
      <Card>
        <CardContent className="space-y-4 p-6">
          <div className="flex items-start gap-3">
            <div
              className={`mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                isSubscribed ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              }`}
            >
              {isSubscribed ? <Bell className="h-5 w-5" /> : <BellOff className="h-5 w-5" />}
            </div>
            <div className="flex-1">
              <h3 className="font-display text-lg uppercase tracking-wide">
                {isSubscribed ? "Notifications activées" : "Notifications désactivées"}
              </h3>
              <p className="text-sm text-muted-foreground">
                {!supported
                  ? "Ton navigateur ne supporte pas les notifications push."
                  : permission === "denied"
                    ? "Tu as refusé la permission. Ouvre les réglages du navigateur pour la rétablir."
                    : isSubscribed
                      ? "Tu recevras des notifications selon tes préférences ci-dessous."
                      : "Active les notifications pour ne rien rater du Tour."}
              </p>
              {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
            </div>
          </div>

          {supported && permission !== "denied" && (
            <div className="flex justify-end gap-2">
              {isSubscribed ? (
                <Button variant="outline" size="sm" onClick={unsubscribe} disabled={loading}>
                  Désactiver
                </Button>
              ) : (
                <Button size="sm" onClick={subscribe} disabled={loading}>
                  {loading ? "..." : "Activer les notifications"}
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* iOS warning */}
      {iosWarning && (
        <Card className="border-amber-300 bg-amber-50">
          <CardContent className="flex items-start gap-3 p-4">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
            <div className="text-sm text-amber-900">
              <p className="font-semibold">Sur iPhone</p>
              <p>
                Les notifications push fonctionnent uniquement si tu installes l&apos;app sur
                l&apos;écran d&apos;accueil (Partager → Sur l&apos;écran d&apos;accueil).
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Preferences */}
      <Card>
        <CardContent className="divide-y divide-border p-0">
          {(Object.keys(PREF_LABELS) as (keyof Preferences)[]).map((key) => {
            const label = PREF_LABELS[key];
            return (
              <div key={key} className="flex items-center justify-between gap-3 p-4">
                <div className="flex-1">
                  <p className="font-semibold">{label.title}</p>
                  <p className="text-xs text-muted-foreground">{label.desc}</p>
                </div>
                <Switch
                  checked={prefs[key]}
                  onCheckedChange={(v) => togglePref(key, v)}
                  disabled={savingKey === key}
                />
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
