import { Button } from "@/components/ui/button";
import Link from "next/link";

export function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-secondary py-16 md:py-24">
      {/* Decorative gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-secondary via-secondary to-primary/20" />

      <div className="relative mx-auto max-w-7xl px-4 text-center">
        <h1 className="font-display text-6xl uppercase text-primary md:text-8xl lg:text-9xl">
          Tour de France
        </h1>
        <p className="mt-2 font-display text-3xl uppercase text-secondary-foreground md:text-5xl">
          Amateur 2026
        </p>
        <p className="mx-auto mt-6 max-w-xl text-lg text-secondary-foreground/80">
          35 amis, 4 équipes parodiques, 6 étapes dans les Alpes.
          Suivi en direct, écarts en temps réel, classements live.
        </p>
        <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Button size="lg" asChild>
            <Link href="/etapes">Voir les étapes</Link>
          </Button>
          <Button size="lg" variant="outline" className="border-secondary-foreground/30 text-secondary-foreground hover:bg-secondary-foreground/10" asChild>
            <Link href="/equipes">Découvrir les équipes</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
