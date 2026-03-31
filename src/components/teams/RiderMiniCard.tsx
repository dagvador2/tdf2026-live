import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronRight } from "lucide-react";

interface RiderMiniCardProps {
  firstName: string;
  nickname: string | null;
  slug: string;
  photoUrl: string | null;
  teamColor: string;
  editionCount: number;
}

export function RiderMiniCard({
  firstName,
  nickname,
  slug,
  photoUrl,
  teamColor,
  editionCount,
}: RiderMiniCardProps) {
  const initials = firstName.charAt(0).toUpperCase();

  return (
    <Link href={`/coureurs/${slug}`}>
      <Card className="group transition-all hover:shadow-md">
        <CardContent className="flex items-center gap-3 p-4">
          {/* Avatar */}
          {photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={photoUrl}
              alt={firstName}
              className="h-12 w-12 rounded-full object-cover"
            />
          ) : (
            <div
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full font-display text-xl text-white"
              style={{ backgroundColor: teamColor }}
            >
              {initials}
            </div>
          )}

          <div className="min-w-0 flex-1">
            <p className="font-display text-base uppercase text-secondary">
              {firstName}
            </p>
            {nickname && (
              <p className="text-sm text-muted-foreground">&laquo; {nickname} &raquo;</p>
            )}
          </div>

          <Badge variant="outline" className="shrink-0 text-xs">
            {editionCount === 1
              ? "1ère éd."
              : `${editionCount}e éd.`}
          </Badge>

          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-1" />
        </CardContent>
      </Card>
    </Link>
  );
}
