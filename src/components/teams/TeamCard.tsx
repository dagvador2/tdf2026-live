import Link from "next/link";
import Image from "next/image";
import { Users, ChevronRight } from "lucide-react";

interface TeamCardProps {
  name: string;
  slug: string;
  color: string;
  description: string | null;
  riderCount: number;
  logoUrl?: string | null;
}

export function TeamCard({ name, slug, color, description, riderCount, logoUrl }: TeamCardProps) {
  return (
    <Link href={`/equipes/${slug}`} className="group block">
      <div
        className="relative overflow-hidden rounded-2xl shadow-sm transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-xl"
        style={{ backgroundColor: color }}
      >
        {/* Darkening wash so white text stays legible even on the bright yellow team */}
        <div className="absolute inset-0 bg-black/45" />
        <div
          aria-hidden
          className="absolute inset-0 opacity-[0.08]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 15% 20%, #fff 1.5px, transparent 1.5px), radial-gradient(circle at 85% 80%, #fff 1.5px, transparent 1.5px)",
            backgroundSize: "60px 60px",
          }}
        />

        <div className="relative flex items-center gap-5 p-6 md:gap-8 md:p-8">
          <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full bg-white shadow-lg transition-transform duration-300 group-hover:scale-105 md:h-32 md:w-32">
            {logoUrl ? (
              <Image
                src={logoUrl}
                alt={name}
                width={88}
                height={88}
                className="h-16 w-16 object-contain md:h-24 md:w-24"
              />
            ) : (
              <Users className="h-10 w-10 md:h-14 md:w-14" style={{ color }} />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <h3 className="font-display text-2xl uppercase leading-none tracking-wide text-white drop-shadow-sm md:text-4xl">
              {name}
            </h3>
            {description && (
              <p className="mt-2 line-clamp-2 text-sm text-white/80 md:text-base">
                {description}
              </p>
            )}
            <p className="mt-3 font-mono text-xs uppercase tracking-[0.2em] text-white/90 md:text-sm">
              {riderCount} coureurs
            </p>
          </div>

          <ChevronRight className="hidden h-8 w-8 shrink-0 text-white/70 transition-transform group-hover:translate-x-1 md:block" />
        </div>
      </div>
    </Link>
  );
}
