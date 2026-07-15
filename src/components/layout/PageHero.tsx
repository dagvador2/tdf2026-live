interface PageHeroProps {
  kicker: string;
  title: string;
  subtitle?: string;
}

/**
 * Broadcast-style dark banner used at the top of public list pages
 * (étapes, classements, équipes…).
 */
export function PageHero({ kicker, title, subtitle }: PageHeroProps) {
  return (
    <section className="relative overflow-hidden bg-secondary text-secondary-foreground">
      {/* Halftone texture, same spirit as the Histoires hero */}
      <div
        aria-hidden
        className="absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 20% 50%, #F2C200 1px, transparent 1px), radial-gradient(circle at 80% 50%, #F2C200 1px, transparent 1px)",
          backgroundSize: "80px 80px",
        }}
      />
      {/* Diagonal yellow accent */}
      <div
        aria-hidden
        className="absolute -right-16 top-0 hidden h-full w-56 -skew-x-12 bg-primary/10 md:block"
      />
      <div className="relative mx-auto max-w-7xl px-4 py-10 md:py-14">
        <p className="font-mono text-xs uppercase tracking-[0.25em] text-primary">
          {kicker}
        </p>
        <h1 className="mt-2 font-display text-4xl uppercase text-white md:text-6xl">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-3 max-w-2xl text-sm text-white/70 md:text-base">
            {subtitle}
          </p>
        )}
      </div>
    </section>
  );
}
