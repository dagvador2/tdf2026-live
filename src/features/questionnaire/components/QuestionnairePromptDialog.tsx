"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const DISMISS_KEY = "questionnaire-prompt-dismissed";

/**
 * Popup d'incitation affichée à l'ouverture de l'app aux utilisateurs qui n'ont
 * pas encore complété le questionnaire (rendu conditionnel côté serveur via
 * QuestionnairePromptGate). Reportable « plus tard » (une fois par session),
 * réapparaît à la prochaine ouverture tant que non complété.
 */
export function QuestionnairePromptDialog({
  imageUrl,
}: {
  imageUrl: string | null;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    // Évite tout mismatch SSR : on décide l'ouverture après hydratation.
    const dismissed = sessionStorage.getItem(DISMISS_KEY) === "1";
    if (!dismissed) {
      const t = window.setTimeout(() => setOpen(true), 600);
      return () => window.clearTimeout(t);
    }
  }, []);

  function dismiss() {
    sessionStorage.setItem(DISMISS_KEY, "1");
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={(o) => (o ? setOpen(true) : dismiss())}>
      <DialogContent className="max-w-sm gap-0 overflow-hidden rounded-2xl p-0">
        {imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt="Pogačar à l'attaque"
            style={{ objectPosition: "center top" }}
            className="h-40 w-full object-cover"
          />
        )}
        <div className="p-6">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl uppercase tracking-wide">
              Tu n&apos;as pas encore fait le questionnaire&nbsp;!
            </DialogTitle>
            <DialogDescription className="text-base">
              Portrait, duels « ou bien », quiz vélo et parrainage de tes potos.
              5 minutes, et ça va servir à des trucs… 👀
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-5 flex-col gap-2 sm:flex-col">
            <Button asChild className="h-12 w-full text-base" onClick={dismiss}>
              <Link href="/questionnaire">C&apos;est parti 🚴</Link>
            </Button>
            <Button variant="ghost" className="h-10 w-full" onClick={dismiss}>
              Plus tard
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
