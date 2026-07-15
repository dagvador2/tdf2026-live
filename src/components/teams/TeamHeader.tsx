import Image from "next/image";
import { Users } from "lucide-react";

interface TeamHeaderProps {
  name: string;
  color: string;
  description: string | null;
  riderCount: number;
  logoUrl?: string | null;
}

/**
 * Full-bleed, broadcast-style team banner — same spirit as PageHero but
 * tinted with the team's own color instead of the app's secondary navy.
 */
export function TeamHeader({ name, color, description, riderCount, logoUrl }: TeamHeaderProps) {
  return (
    <section className="relative overflow-hidden" style={{ backgroundColor: color }}>
      <div className="absolute inset-0 bg-black/45" />
      <div
        aria-hidden
        className="absolute inset-0 opacity-[0.08]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 20% 30%, #fff 1.5px, transparent 1.5px), radial-gradient(circle at 80% 70%, #fff 1.5px, transparent 1.5px)",
          backgroundSize: "70px 70px",
        }}
      />

      <div className="relative mx-auto flex max-w-3xl flex-col items-center gap-5 px-4 py-12 text-center md:flex-row md:items-center md:gap-8 md:py-16 md:text-left">
        <div className="flex h-28 w-28 shrink-0 items-center justify-center rounded-full bg-white shadow-xl md:h-40 md:w-40">
          {logoUrl ? (
            <Image
              src={logoUrl}
              alt={name}
              width={100}
              height={100}
              className="h-20 w-20 object-contain md:h-28 md:w-28"
            />
          ) : (
            <Users className="h-12 w-12 md:h-16 md:w-16" style={{ color }} />
          )}
        </div>
        <div>
          <h1 className="font-display text-4xl uppercase leading-none tracking-wide text-white drop-shadow-sm md:text-6xl">
            {name}
          </h1>
          {description && (
            <p className="mt-3 max-w-xl text-white/85 md:text-lg">{description}</p>
          )}
          <p className="mt-3 font-mono text-xs uppercase tracking-[0.25em] text-white/90 md:text-sm">
            {riderCount} coureurs
          </p>
        </div>
      </div>
    </section>
  );
}
