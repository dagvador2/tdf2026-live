import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Users } from "lucide-react";

interface TeamGridItem {
  id: string;
  name: string;
  slug: string;
  color: string;
  _count: { riders: number };
}

export function TeamGrid({ teams }: { teams: TeamGridItem[] }) {
  return (
    <section className="mx-auto max-w-7xl px-4 py-12">
      <h2 className="mb-8 text-center font-display text-3xl uppercase text-secondary md:text-4xl">
        Les 4 équipes
      </h2>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-6">
        {teams.map((team) => (
          <Link key={team.id} href={`/equipes/${team.slug}`}>
            <Card className="group overflow-hidden transition-shadow hover:shadow-lg">
              <div
                className="h-2"
                style={{ backgroundColor: team.color }}
              />
              <CardContent className="p-4 text-center">
                <div
                  className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full"
                  style={{ backgroundColor: `${team.color}20` }}
                >
                  <Users
                    className="h-6 w-6"
                    style={{ color: team.color }}
                  />
                </div>
                <h3 className="font-display text-sm uppercase leading-tight text-secondary md:text-base">
                  {team.name}
                </h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  {team._count.riders} coureurs
                </p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </section>
  );
}
