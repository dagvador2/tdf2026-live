import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface RiderHeroProps {
  firstName: string;
  nickname: string | null;
  photoUrl: string | null;
  teamName: string;
  teamSlug: string;
  teamColor: string;
  editionCount: number;
}

export function RiderHero({
  firstName,
  nickname,
  photoUrl,
  teamName,
  teamSlug,
  teamColor,
  editionCount,
}: RiderHeroProps) {
  return (
    <section className="relative overflow-hidden bg-secondary text-white">
      <div
        aria-hidden
        className="absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 20% 30%, #F2C200 1px, transparent 1px), radial-gradient(circle at 80% 70%, #F2C200 1px, transparent 1px)",
          backgroundSize: "80px 80px",
        }}
      />

      <div className="relative mx-auto max-w-6xl px-4 py-10 md:py-16">
        <Link
          href={`/equipes/${teamSlug}`}
          className="inline-flex items-center gap-1.5 text-sm text-white/70 transition-colors hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          {teamName}
        </Link>

        <div className="mt-6 grid gap-8 md:grid-cols-2 md:items-center md:gap-16">
          <div className="order-2 md:order-1">
            <div className="flex items-center gap-3">
              <span className="h-px w-8 bg-white/60" aria-hidden="true" />
              <span
                className="font-mono text-xs uppercase tracking-[0.25em]"
                style={{ color: teamColor }}
              >
                {teamName}
              </span>
            </div>
            <h1 className="mt-3 font-display text-6xl uppercase leading-[0.9] text-white drop-shadow-sm md:text-8xl">
              {firstName}
            </h1>
            {nickname && (
              <p className="mt-3 text-xl text-white/80">&laquo; {nickname} &raquo;</p>
            )}
            <Badge variant="outline" className="mt-5 border-white/30 text-white">
              {editionCount === 1 ? "1ère édition" : `${editionCount}e édition`}
            </Badge>
          </div>

          <div className="order-1 aspect-[4/5] w-full max-w-sm overflow-hidden rounded-3xl shadow-2xl md:order-2 md:max-w-md md:justify-self-end">
            {photoUrl ? (
              <Image
                src={photoUrl}
                alt={firstName}
                width={480}
                height={600}
                priority
                sizes="(max-width: 768px) 90vw, 400px"
                className="h-full w-full object-cover object-top"
              />
            ) : (
              <div
                className="flex h-full w-full items-center justify-center"
                style={{ backgroundColor: teamColor }}
              >
                <Users className="h-20 w-20 text-white/50" />
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
