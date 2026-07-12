"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import {
  Bike,
  Radio,
  Trophy,
  Users,
  BookOpen,
  ChevronLeft,
  X,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const STORAGE_KEY = "tdf2026-welcome-tour-seen";
const OPEN_EVENT = "tdf2026:welcome-tour-open";

/** Opens the welcome tour from anywhere in the app (e.g. the header help button). */
export function openWelcomeTour() {
  window.dispatchEvent(new Event(OPEN_EVENT));
}

interface Slide {
  icon: LucideIcon;
  title: string;
  text: string;
  note?: string;
}

const SLIDES: Slide[] = [
  {
    icon: Bike,
    title: "Bienvenue sur le TDF Le Vrai",
    text: "Le Tour de France entre amis : une trentaine de coureurs amateurs, 4 équipes, 6 étapes dans les Alpes du 20 au 25 juillet 2026. Cette appli te permet de suivre la course en direct, depuis le bord de la route ou ton canapé.",
  },
  {
    icon: Radio,
    title: "Suis la course en direct",
    text: "Quand une étape est en cours, un bandeau rouge « En direct » apparaît en haut de l'appli. Un clic et tu vois les coureurs sur la carte GPS, avec les écarts en temps réel. Les contre-la-montre sont aussi diffusés en vidéo dans l'onglet « En direct ».",
  },
  {
    icon: Trophy,
    title: "Les classements",
    text: "Maillot jaune au général, classement par équipes, meilleur grimpeur, résultats d'étape… Tout est recalculé après chaque étape dans l'onglet Classements.",
  },
  {
    icon: Users,
    title: "Équipes & coureurs",
    text: "Découvre les 4 équipes (aux sponsors très sérieux) et la fiche de chaque coureur avec ses fun facts. De quoi choisir ton favori avant le départ.",
  },
  {
    icon: BookOpen,
    title: "Les histoires du Tour",
    text: "En attendant la course, plonge dans les grandes histoires du vrai Tour de France : duels mythiques, exploits hors normes et cols légendaires.",
    note: "Tu participes en tant que coureur ? Connecte-toi via « Mon espace ».",
  },
];

// Pages where the tour must never auto-open (login, rider and admin flows)
const EXCLUDED_PREFIXES = [
  "/admin",
  "/overlay",
  "/connexion",
  "/questionnaire",
  "/coureur",
  "/mon-espace",
];

/**
 * Tutoriel de bienvenue pour les nouveaux spectateurs : carrousel de slides
 * qui s'ouvre automatiquement à la première visite (visiteurs non connectés
 * uniquement — les coureurs connaissent déjà l'appli). Réouvrable à tout
 * moment via le bouton « ? » du header (openWelcomeTour).
 */
export function WelcomeTour() {
  const pathname = usePathname();
  const { status } = useSession();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  // Manual open from anywhere (header help button)
  useEffect(() => {
    const handler = () => {
      setStep(0);
      setOpen(true);
    };
    window.addEventListener(OPEN_EVENT, handler);
    return () => window.removeEventListener(OPEN_EVENT, handler);
  }, []);

  // Auto-open on first visit, for logged-out visitors only. The "seen" flag
  // lives in localStorage — losing it just replays the tour, nothing critical.
  useEffect(() => {
    if (status !== "unauthenticated") return;
    if (EXCLUDED_PREFIXES.some((p) => pathname.startsWith(p))) return;
    if (localStorage.getItem(STORAGE_KEY)) return;

    const timer = setTimeout(() => setOpen(true), 600);
    return () => clearTimeout(timer);
  }, [status, pathname]);

  const handleOpenChange = useCallback((next: boolean) => {
    setOpen(next);
    if (!next) localStorage.setItem(STORAGE_KEY, "1");
  }, []);

  const isLast = step === SLIDES.length - 1;
  const slide = SLIDES[step];
  const Icon = slide.icon;

  return (
    <DialogPrimitive.Root open={open} onOpenChange={handleOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          className="fixed left-[50%] top-[50%] z-50 w-[calc(100%-2rem)] max-w-md translate-x-[-50%] translate-y-[-50%] overflow-hidden rounded-xl border border-border bg-background shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
          aria-describedby={undefined}
        >
          {/* Illustration band */}
          <div className="relative flex flex-col items-center gap-3 bg-secondary px-6 pb-6 pt-9 text-center">
            <DialogPrimitive.Close className="absolute right-3 top-3 rounded-sm text-secondary-foreground/60 transition-colors hover:text-secondary-foreground focus:outline-none focus:ring-2 focus:ring-primary">
              <X className="h-5 w-5" />
              <span className="sr-only">Fermer</span>
            </DialogPrimitive.Close>
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary">
              <Icon className="h-8 w-8 text-secondary" />
            </div>
            <DialogPrimitive.Title className="font-display text-2xl uppercase tracking-wide text-secondary-foreground">
              {slide.title}
            </DialogPrimitive.Title>
          </div>

          {/* Slide body */}
          <div className="px-6 py-5">
            <p className="text-center text-sm leading-relaxed text-muted-foreground">
              {slide.text}
            </p>
            {slide.note && (
              <p className="mt-3 text-center text-xs text-muted-foreground/70">
                {slide.note}
              </p>
            )}
          </div>

          {/* Dots + navigation */}
          <div className="flex items-center justify-between gap-2 border-t border-border px-4 py-3">
            {step === 0 ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleOpenChange(false)}
              >
                Passer
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setStep(step - 1)}
              >
                <ChevronLeft className="mr-0.5 h-4 w-4" />
                Retour
              </Button>
            )}

            <div className="flex gap-1.5">
              {SLIDES.map((s, i) => (
                <button
                  key={s.title}
                  type="button"
                  onClick={() => setStep(i)}
                  aria-label={`Aller à l'écran ${i + 1}`}
                  className={cn(
                    "h-2 rounded-full transition-all",
                    i === step
                      ? "w-5 bg-primary"
                      : "w-2 bg-muted-foreground/30 hover:bg-muted-foreground/50",
                  )}
                />
              ))}
            </div>

            <Button
              size="sm"
              onClick={() =>
                isLast ? handleOpenChange(false) : setStep(step + 1)
              }
            >
              {isLast ? "C'est parti !" : "Suivant"}
            </Button>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
