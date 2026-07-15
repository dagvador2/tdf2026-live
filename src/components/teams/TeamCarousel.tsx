"use client";

import { useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { ChevronLeft, ChevronRight, Users } from "lucide-react";

interface Team {
  id: string;
  name: string;
  slug: string;
  color: string;
  description: string | null;
  riderCount: number;
  logoUrl: string | null;
}

export function TeamCarousel({ teams }: { teams: Team[] }) {
  const trackRef = useRef<HTMLDivElement>(null);

  function scrollByCard(direction: 1 | -1) {
    const track = trackRef.current;
    if (!track) return;
    const card = track.querySelector("[data-team-card]") as HTMLElement | null;
    const distance = (card?.offsetWidth ?? 320) + 20;
    track.scrollBy({ left: direction * distance, behavior: "smooth" });
  }

  return (
    <div className="relative">
      <div
        ref={trackRef}
        className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-5 overflow-x-auto px-4 pb-4"
      >
        {teams.map((team) => (
          <Link
            key={team.id}
            href={`/equipes/${team.slug}`}
            data-team-card
            className="group relative w-[78vw] max-w-[320px] shrink-0 snap-center overflow-hidden rounded-3xl shadow-md transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl sm:w-[340px]"
            style={{ backgroundColor: team.color }}
          >
            <div className="absolute inset-0 bg-black/45" />
            <div
              aria-hidden
              className="absolute inset-0 opacity-[0.08]"
              style={{
                backgroundImage:
                  "radial-gradient(circle at 20% 25%, #fff 1.5px, transparent 1.5px), radial-gradient(circle at 80% 75%, #fff 1.5px, transparent 1.5px)",
                backgroundSize: "56px 56px",
              }}
            />

            <div className="relative flex h-[440px] flex-col items-center justify-between p-8 text-center sm:h-[480px]">
              <div className="flex h-28 w-28 items-center justify-center rounded-full bg-white shadow-xl transition-transform duration-300 group-hover:scale-105 sm:h-32 sm:w-32">
                {team.logoUrl ? (
                  <Image
                    src={team.logoUrl}
                    alt={team.name}
                    width={92}
                    height={92}
                    className="h-20 w-20 object-contain sm:h-24 sm:w-24"
                  />
                ) : (
                  <Users className="h-12 w-12" style={{ color: team.color }} />
                )}
              </div>

              <div>
                <h3 className="font-display text-3xl uppercase leading-none tracking-wide text-white drop-shadow-sm sm:text-4xl">
                  {team.name}
                </h3>
                {team.description && (
                  <p className="mx-auto mt-3 max-w-[26ch] text-sm text-white/80">
                    {team.description}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2 rounded-full border border-white/30 px-4 py-2 font-mono text-xs uppercase tracking-[0.2em] text-white transition-colors group-hover:bg-white group-hover:text-secondary">
                {team.riderCount} coureurs
                <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
              </div>
            </div>
          </Link>
        ))}
      </div>

      <div className="mt-2 hidden items-center justify-end gap-2 sm:flex">
        <button
          type="button"
          onClick={() => scrollByCard(-1)}
          aria-label="Équipe précédente"
          className="flex h-10 w-10 items-center justify-center rounded-full border border-border text-secondary transition-colors hover:bg-secondary hover:text-secondary-foreground"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={() => scrollByCard(1)}
          aria-label="Équipe suivante"
          className="flex h-10 w-10 items-center justify-center rounded-full border border-border text-secondary transition-colors hover:bg-secondary hover:text-secondary-foreground"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}
