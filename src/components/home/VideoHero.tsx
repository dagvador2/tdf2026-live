"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { APP_CONFIG } from "@/lib/utils/constants";
import { ChevronDown, Radio } from "lucide-react";
import { Mountain, Route, Users, Calendar } from "lucide-react";

/**
 * Drop a video at public/hero/hero-home.mp4 (muted H.264, ~1080p, < 8 MB)
 * and it plays automatically. Until then — or if it fails to load — the
 * animated mountain backdrop below takes over.
 */
const HERO_VIDEO_SRC = "/hero/hero-home.mp4";

interface VideoHeroProps {
  riderCount: number;
  stageCount: number;
  totalKm: number;
  totalElevation: number;
  liveStage: { id: string; number: number } | null;
}

interface CountdownParts {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

function computeCountdown(target: Date): CountdownParts | null {
  const diff = target.getTime() - Date.now();
  if (diff <= 0) return null;
  return {
    days: Math.floor(diff / 86_400_000),
    hours: Math.floor(diff / 3_600_000) % 24,
    minutes: Math.floor(diff / 60_000) % 60,
    seconds: Math.floor(diff / 1_000) % 60,
  };
}

const pad = (n: number) => String(n).padStart(2, "0");

export function VideoHero({
  riderCount,
  stageCount,
  totalKm,
  totalElevation,
  liveStage,
}: VideoHeroProps) {
  const [videoOk, setVideoOk] = useState(true);
  const [reducedMotion, setReducedMotion] = useState(false);
  // Countdown is rendered client-side only to avoid hydration mismatch
  const [countdown, setCountdown] = useState<CountdownParts | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setReducedMotion(
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    );
    setCountdown(computeCountdown(APP_CONFIG.EVENT_DATE));
    const interval = setInterval(
      () => setCountdown(computeCountdown(APP_CONFIG.EVENT_DATE)),
      1_000
    );
    return () => clearInterval(interval);
  }, []);

  const stats = [
    { icon: Users, value: String(riderCount), label: "Coureurs" },
    { icon: Calendar, value: String(stageCount), label: "Étapes" },
    { icon: Route, value: `${totalKm.toFixed(0)} km`, label: "Distance" },
    {
      icon: Mountain,
      value: `${totalElevation.toLocaleString("fr-FR")} m`,
      label: "Dénivelé",
    },
  ];

  return (
    <section className="relative -mt-16 flex min-h-[100svh] flex-col overflow-hidden bg-secondary text-white">
      {/* Animated fallback backdrop (visible until the video paints) */}
      <div aria-hidden className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-b from-[#12152b] via-[#1B1F3B] to-[#12152b]" />
        {/* Sun glow */}
        <div className="absolute left-1/2 top-[28%] h-72 w-72 -translate-x-1/2 rounded-full bg-primary/20 blur-3xl" />
        {/* Mountain ridges */}
        <svg
          viewBox="0 0 1200 400"
          preserveAspectRatio="xMidYMax slice"
          className="animate-hero-drift-slow absolute bottom-0 left-[-10%] h-[55%] w-[120%] text-[#232849]"
        >
          <path
            fill="currentColor"
            d="M0 400 L120 300 L260 360 L420 220 L560 330 L720 180 L900 320 L1040 240 L1200 340 L1200 400 Z"
          />
        </svg>
        <svg
          viewBox="0 0 1200 400"
          preserveAspectRatio="xMidYMax slice"
          className="animate-hero-drift absolute bottom-0 left-[-10%] h-[42%] w-[120%] text-[#161a33]"
        >
          <path
            fill="currentColor"
            d="M0 400 L180 260 L340 350 L520 200 L700 340 L860 230 L1020 330 L1200 260 L1200 400 Z"
          />
        </svg>
      </div>

      {/* Video layer */}
      {videoOk && !reducedMotion && (
        <video
          className="absolute inset-0 h-full w-full object-cover"
          src={HERO_VIDEO_SRC}
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          poster="/hero/hero-home-poster.jpg"
          onError={() => setVideoOk(false)}
        />
      )}

      {/* Readability overlay */}
      <div
        aria-hidden
        className="absolute inset-0 bg-gradient-to-b from-secondary/80 via-secondary/30 to-secondary/90"
      />

      {/* Content */}
      <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-4 pb-24 pt-28 text-center">
        <p className="animate-hero-fade-up font-mono text-xs uppercase tracking-[0.3em] text-primary md:text-sm">
          20 – 25 juillet 2026 · Alpes
        </p>
        <h1 className="animate-hero-fade-up hero-delay-1 mt-4 font-display text-6xl uppercase leading-[0.95] text-white drop-shadow-lg md:text-8xl lg:text-9xl">
          Tour de France
          <span className="block text-primary">Amateur 2026</span>
        </h1>
        <p className="animate-hero-fade-up hero-delay-2 mx-auto mt-6 max-w-xl text-base text-white/80 md:text-lg">
          {riderCount} amis, 4 équipes parodiques, {stageCount} étapes dans les
          Alpes. Suivi en direct, écarts en temps réel, classements live.
        </p>

        {/* Countdown or live call-out */}
        <div className="animate-hero-fade-up hero-delay-2 mt-8">
          {liveStage ? (
            <Link
              href={`/etapes/${liveStage.id}/live`}
              className="inline-flex items-center gap-2 rounded-full bg-red-600 px-6 py-3 font-display text-lg uppercase tracking-wide text-white shadow-lg transition-colors hover:bg-red-700"
            >
              <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-white" />
              <Radio className="h-5 w-5" />
              Étape {liveStage.number} en direct
            </Link>
          ) : (
            mounted &&
            countdown && (
              <div className="inline-flex items-end gap-4 rounded-lg border border-white/15 bg-white/5 px-6 py-4 backdrop-blur-sm">
                {[
                  { value: String(countdown.days), label: "jours" },
                  { value: pad(countdown.hours), label: "heures" },
                  { value: pad(countdown.minutes), label: "min" },
                  { value: pad(countdown.seconds), label: "sec" },
                ].map((part) => (
                  <div key={part.label} className="min-w-12 text-center">
                    <div className="font-mono text-3xl font-bold text-primary md:text-4xl">
                      {part.value}
                    </div>
                    <div className="mt-1 text-[10px] uppercase tracking-widest text-white/60">
                      {part.label}
                    </div>
                  </div>
                ))}
              </div>
            )
          )}
        </div>

        <div className="animate-hero-fade-up hero-delay-3 mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Button size="lg" asChild>
            <Link href="/etapes">Voir les étapes</Link>
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="border-white/30 bg-transparent text-white hover:bg-white/10 hover:text-white"
            asChild
          >
            <Link href="/equipes">Découvrir les équipes</Link>
          </Button>
        </div>
      </div>

      {/* Stats strip — broadcast lower third */}
      <div className="relative z-10 border-t border-white/10 bg-secondary/60 backdrop-blur-sm">
        <div className="mx-auto grid max-w-5xl grid-cols-2 gap-x-4 gap-y-5 px-4 py-5 md:grid-cols-4">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <div
                key={stat.label}
                className="flex items-center justify-center gap-3"
              >
                <Icon className="h-5 w-5 shrink-0 text-primary" />
                <div className="text-left">
                  <div className="font-mono text-xl font-bold leading-none text-white md:text-2xl">
                    {stat.value}
                  </div>
                  <div className="mt-1 text-[11px] uppercase tracking-wider text-white/50">
                    {stat.label}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Scroll cue */}
      <div
        aria-hidden
        className="pointer-events-none absolute bottom-24 left-1/2 z-10 hidden -translate-x-1/2 md:block"
      >
        <ChevronDown className="animate-scroll-cue h-6 w-6 text-white/50" />
      </div>
    </section>
  );
}
