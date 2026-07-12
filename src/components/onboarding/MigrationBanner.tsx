"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";

const DISMISS_KEY = "letourexplorer-migration-dismissed";

/**
 * Bandeau affiché aux visiteurs qui arrivent depuis l'ancien domaine Railway
 * (redirigés vers letourexplorer.com). Détection :
 *  - flag `from_old_domain=1` posé par le middleware de redirection sur l'URL
 *    (fiable, y compris pour une PWA relancée sans referrer) ;
 *  - à défaut, referrer contenant "up.railway.app".
 * Le rejet est mémorisé en localStorage. On nettoie le flag de l'URL pour ne
 * pas le propager (partage, historique).
 */
export function MigrationBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (localStorage.getItem(DISMISS_KEY)) return;

    const params = new URLSearchParams(window.location.search);
    const fromFlag = params.get("from_old_domain") === "1";
    const fromReferrer = document.referrer.includes("up.railway.app");

    if (fromFlag) {
      params.delete("from_old_domain");
      const qs = params.toString();
      const clean =
        window.location.pathname +
        (qs ? `?${qs}` : "") +
        window.location.hash;
      window.history.replaceState(null, "", clean);
    }

    if (fromFlag || fromReferrer) setShow(true);
  }, []);

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, "1");
    setShow(false);
  }

  if (!show) return null;

  return (
    <div className="relative z-40 border-b border-primary/40 bg-secondary text-secondary-foreground">
      <div className="mx-auto flex max-w-3xl items-start gap-3 px-4 py-3">
        <span className="text-lg leading-none">🎉</span>
        <p className="flex-1 text-sm leading-snug">
          Nouvelle adresse : l&apos;app est maintenant sur{" "}
          <strong className="text-primary">letourexplorer.com</strong>. Si tu
          l&apos;avais ajoutée à ton écran d&apos;accueil, réinstalle-la depuis{" "}
          <strong>letourexplorer.com</strong> pour la meilleure expérience.
        </p>
        <button
          type="button"
          onClick={dismiss}
          className="shrink-0 rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-secondary transition-opacity hover:opacity-90"
        >
          OK, compris
        </button>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Fermer"
          className="shrink-0 rounded-sm text-secondary-foreground/60 transition-colors hover:text-secondary-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
