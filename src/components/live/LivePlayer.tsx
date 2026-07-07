"use client";

import { useEffect, useState } from "react";
import { useTwitchLive } from "@/hooks/useTwitchLive";
import { Radio } from "lucide-react";

interface NextLive {
  label: string;
  dateLabel: string;
}

interface LivePlayerProps {
  channel: string;
  nextLive: NextLive | null;
  initialStatus: {
    configured: boolean;
    live: boolean;
    title: string | null;
    startedAt: string | null;
  };
}

/**
 * Player Twitch embedé, responsive (mobile-first).
 * Affiche le player quand la chaîne est en live, sinon l'annonce
 * du prochain direct.
 */
export function LivePlayer({ channel, nextLive, initialStatus }: LivePlayerProps) {
  const status = useTwitchLive(initialStatus);
  // Le player Twitch exige le hostname parent — disponible seulement côté client
  const [parentHost, setParentHost] = useState<string | null>(null);

  useEffect(() => {
    setParentHost(window.location.hostname);
  }, []);

  if (status.live && parentHost) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 rounded-full bg-red-600 px-3 py-1 text-xs font-bold uppercase tracking-wide text-white">
            <span className="h-2 w-2 animate-pulse rounded-full bg-white" />
            En direct
          </span>
          {status.title && (
            <span className="truncate text-sm text-muted-foreground">
              {status.title}
            </span>
          )}
        </div>

        <div className="overflow-hidden rounded-lg border border-border bg-black shadow-md">
          <iframe
            src={`https://player.twitch.tv/?channel=${encodeURIComponent(channel)}&parent=${encodeURIComponent(parentHost)}&autoplay=true&muted=true`}
            title={`Direct Twitch — ${channel}`}
            allowFullScreen
            className="aspect-video w-full"
          />
        </div>

        <p className="text-xs text-muted-foreground">
          Le son est coupé par défaut — appuie sur le player pour l&apos;activer.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-card p-8 text-center">
      <Radio className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
      <p className="mb-1 font-display text-2xl uppercase text-secondary">
        Pas de direct en cours
      </p>
      {nextLive ? (
        <p className="text-muted-foreground">
          Prochain live : <span className="font-medium text-foreground">{nextLive.label}</span>{" "}
          — {nextLive.dateLabel}
        </p>
      ) : (
        <p className="text-muted-foreground">
          Reviens pendant les étapes de contre-la-montre !
        </p>
      )}
    </div>
  );
}
