import { FUN_FACT_FIELDS } from "@/lib/utils/constants";
import { Card, CardContent } from "@/components/ui/card";

interface FunFactsProps {
  funFacts: Record<string, string> | null;
}

export function FunFacts({ funFacts }: FunFactsProps) {
  if (!funFacts) return null;

  const entries = FUN_FACT_FIELDS.filter(
    (field) => funFacts[field.key] && funFacts[field.key].trim() !== ""
  );

  if (entries.length === 0) return null;

  return (
    <Card>
      <CardContent className="p-5">
        <h3 className="mb-4 font-display text-xl uppercase text-secondary">
          Fun Facts
        </h3>
        <dl className="space-y-3">
          {entries.map((field) => (
            <div key={field.key}>
              <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {field.label}
              </dt>
              <dd className="mt-0.5 text-sm text-foreground">
                {funFacts[field.key]}
              </dd>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  );
}
