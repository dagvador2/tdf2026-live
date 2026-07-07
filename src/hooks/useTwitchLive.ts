"use client";

import { useEffect, useState } from "react";

const POLL_INTERVAL_MS = 60_000;

interface TwitchStatus {
  configured: boolean;
  live: boolean;
  title: string | null;
  startedAt: string | null;
}

/**
 * Statut live de la chaîne Twitch, rafraîchi toutes les 60 secondes.
 * Sert au badge "EN DIRECT" dans la navigation et à la page /live.
 */
export function useTwitchLive(initialStatus?: TwitchStatus) {
  const [status, setStatus] = useState<TwitchStatus>(
    initialStatus ?? { configured: false, live: false, title: null, startedAt: null }
  );

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      try {
        const res = await fetch("/api/live/twitch-status", { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) setStatus(data);
      } catch {
        // Réseau indisponible : on garde le dernier statut connu
      }
    }

    poll();
    const interval = setInterval(poll, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  return status;
}
