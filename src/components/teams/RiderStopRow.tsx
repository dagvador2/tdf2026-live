import Link from "next/link";
import { ArrowUpRight, Bike, GlassWater, Mountain, Music, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";

interface RiderStopRowProps {
  index: number;
  firstName: string;
  nickname: string | null;
  slug: string;
  photoUrl: string | null;
  teamColor: string;
  editionCount: number;
  funFacts: Record<string, string> | null;
  reversed: boolean;
}

const FACT_ORDER: { key: string; label: string; icon: typeof Mountain }[] = [
  { key: "col_prefere", label: "Col préféré", icon: Mountain },
  { key: "boisson_apres_3000m", label: "Boisson après 3000m", icon: GlassWater },
  { key: "surnom_velo", label: "Surnom du vélo", icon: Bike },
  { key: "coureur_all_time", label: "Coureur all time", icon: Trophy },
  { key: "chanson_col", label: "Chanson dans un col", icon: Music },
];

export function RiderStopRow({
  index,
  firstName,
  nickname,
  slug,
  photoUrl,
  teamColor,
  editionCount,
  funFacts,
  reversed,
}: RiderStopRowProps) {
  const nLabel = String(index).padStart(2, "0");
  const facts = FACT_ORDER.map((f) => ({ ...f, value: funFacts?.[f.key]?.trim() }))
    .filter((f) => f.value)
    .slice(0, 3);
  const editionLabel = editionCount === 1 ? "1ère édition" : `${editionCount}e édition`;

  return (
    <li className="group w-[85%] shrink-0 snap-start overflow-hidden rounded-2xl border border-border bg-card min-[900px]:w-auto min-[900px]:shrink min-[900px]:snap-align-none min-[900px]:overflow-visible min-[900px]:rounded-none min-[900px]:border-0 min-[900px]:bg-transparent">
      <div className="grid grid-cols-1 min-[900px]:grid-cols-2 min-[900px]:items-center min-[900px]:gap-16">
        <div
          className={cn(
            "aspect-[4/3] min-w-0 overflow-hidden bg-muted min-[900px]:aspect-[4/5] min-[900px]:rounded-2xl",
            reversed ? "min-[900px]:order-2" : "min-[900px]:order-1"
          )}
        >
          {photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={photoUrl}
              alt={firstName}
              className="h-full w-full object-cover transition-transform duration-500 min-[900px]:group-hover:scale-[1.03]"
            />
          ) : (
            <div
              className="flex h-full w-full items-center justify-center font-display text-8xl text-white"
              style={{ backgroundColor: teamColor }}
            >
              {firstName.charAt(0).toUpperCase()}
            </div>
          )}
        </div>

        <div
          className={cn(
            "flex flex-col p-6 min-[900px]:p-0",
            reversed ? "min-[900px]:order-1" : "min-[900px]:order-2"
          )}
        >
          <span className="font-mono text-6xl leading-none text-border min-[900px]:text-8xl">
            {nLabel}
          </span>
          <div className="mb-4 mt-2 flex items-center gap-3">
            <span className="h-px w-8 bg-secondary" aria-hidden="true" />
            <span
              className="font-mono text-xs uppercase tracking-[0.25em]"
              style={{ color: teamColor }}
            >
              {editionLabel}
            </span>
          </div>
          <h3 className="font-display text-4xl uppercase leading-none text-secondary min-[900px]:text-5xl">
            {firstName}
          </h3>
          {nickname && (
            <p className="mt-2 text-lg text-muted-foreground">&laquo; {nickname} &raquo;</p>
          )}

          {facts.length > 0 && (
            <ul className="mt-6 max-w-md space-y-3 border-t border-border pt-5">
              {facts.map((fact) => (
                <li key={fact.key} className="flex items-start gap-3 text-sm">
                  <fact.icon
                    className="mt-0.5 h-4 w-4 shrink-0"
                    style={{ color: teamColor }}
                    aria-hidden="true"
                  />
                  <span>
                    <span className="text-muted-foreground">{fact.label} — </span>
                    <span className="text-foreground">{fact.value}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}

          <Link
            href={`/coureurs/${slug}`}
            className="mt-8 inline-flex w-fit items-center gap-1.5 rounded-full border border-border px-5 py-2.5 text-sm font-medium text-secondary transition-colors hover:bg-secondary hover:text-secondary-foreground"
          >
            Voir le profil
            <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </li>
  );
}
