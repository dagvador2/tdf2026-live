import Link from "next/link";
import { Mountain, GlassWater } from "lucide-react";
import { AvatarInitials } from "@/components/riders/AvatarInitials";
import { Badge } from "@/components/ui/badge";

interface RiderMiniCardProps {
  firstName: string;
  nickname: string | null;
  slug: string;
  photoUrl: string | null;
  teamColor: string;
  editionCount: number;
  funFacts: Record<string, string> | null;
}

export function RiderMiniCard({
  firstName,
  nickname,
  slug,
  photoUrl,
  teamColor,
  editionCount,
  funFacts,
}: RiderMiniCardProps) {
  const colPrefere = funFacts?.col_prefere?.trim();
  const boisson = funFacts?.boisson_apres_3000m?.trim();

  return (
    <Link href={`/coureurs/${slug}`} className="group block">
      <div className="relative overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-xl">
        <div className="h-2" style={{ backgroundColor: teamColor }} />
        <div className="flex flex-col items-center gap-3 p-6 text-center">
          <AvatarInitials firstName={firstName} photoUrl={photoUrl} teamColor={teamColor} size="lg" />

          <div>
            <p className="font-display text-2xl uppercase leading-tight text-secondary">
              {firstName}
            </p>
            {nickname && (
              <p className="text-sm text-muted-foreground">&laquo; {nickname} &raquo;</p>
            )}
          </div>

          <Badge variant="outline" className="text-xs">
            {editionCount === 1 ? "1ère éd." : `${editionCount}e éd.`}
          </Badge>

          {(colPrefere || boisson) && (
            <div className="mt-1 w-full space-y-1.5 border-t border-border pt-3 text-left">
              {colPrefere && (
                <p className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Mountain className="h-3.5 w-3.5 shrink-0" style={{ color: teamColor }} />
                  <span className="truncate">{colPrefere}</span>
                </p>
              )}
              {boisson && (
                <p className="flex items-center gap-2 text-xs text-muted-foreground">
                  <GlassWater className="h-3.5 w-3.5 shrink-0" style={{ color: teamColor }} />
                  <span className="truncate">{boisson}</span>
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
