import { FUN_FACT_FIELDS } from "@/lib/utils/constants";
import {
  Bike,
  Flag,
  Frown,
  GlassWater,
  MessageCircleQuestion,
  Mountain,
  Music,
  PartyPopper,
  Star,
  Tag,
  Trophy,
} from "lucide-react";

const FACT_ICONS: Record<string, typeof Mountain> = {
  coureur_tdf_2025: Flag,
  coureur_all_time: Trophy,
  souvenir_tour: Star,
  marque_velo_reve: Bike,
  col_prefere: Mountain,
  pire_souvenir_velo: Frown,
  meilleur_souvenir_velo: PartyPopper,
  surnom_velo: Tag,
  chanson_col: Music,
  boisson_apres_3000m: GlassWater,
  excuse_col: MessageCircleQuestion,
};

interface FunFactsProps {
  funFacts: Record<string, string> | null;
  teamColor: string;
}

export function FunFacts({ funFacts, teamColor }: FunFactsProps) {
  if (!funFacts) return null;

  const entries = FUN_FACT_FIELDS.filter(
    (field) => funFacts[field.key] && funFacts[field.key].trim() !== ""
  );

  if (entries.length === 0) return null;

  return (
    <div>
      <h2 className="font-display text-2xl uppercase text-secondary md:text-3xl">
        Fun Facts
      </h2>
      <dl className="mt-6 grid gap-5 sm:grid-cols-2">
        {entries.map((field) => {
          const Icon = FACT_ICONS[field.key] ?? Mountain;
          return (
            <div
              key={field.key}
              className="flex gap-4 rounded-2xl border border-border bg-card p-5"
            >
              <Icon
                className="mt-0.5 h-5 w-5 shrink-0"
                style={{ color: teamColor }}
                aria-hidden="true"
              />
              <div className="min-w-0">
                <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {field.label}
                </dt>
                <dd className="mt-1 text-base text-foreground">
                  {funFacts[field.key]}
                </dd>
              </div>
            </div>
          );
        })}
      </dl>
    </div>
  );
}
