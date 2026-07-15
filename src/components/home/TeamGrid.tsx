import Link from "next/link";
import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { Users } from "lucide-react";

interface TeamGridItem {
  id: string;
  name: string;
  slug: string;
  color: string;
  logoUrl: string | null;
  _count: { riders: number };
}

export function TeamGrid({ teams }: { teams: TeamGridItem[] }) {
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-6">
      {teams.map((team) => (
        <Link key={team.id} href={`/equipes/${team.slug}`}>
          <Card className="group h-full overflow-hidden transition-all hover:-translate-y-0.5 hover:shadow-lg">
            <div className="h-2" style={{ backgroundColor: team.color }} />
            <CardContent className="p-4 text-center">
              <div
                className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full transition-transform group-hover:scale-105"
                style={{ backgroundColor: `${team.color}20` }}
              >
                {team.logoUrl ? (
                  <Image
                    src={team.logoUrl}
                    alt={team.name}
                    width={36}
                    height={36}
                    className="h-9 w-9 object-contain"
                  />
                ) : (
                  <Users className="h-6 w-6" style={{ color: team.color }} />
                )}
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
  );
}
